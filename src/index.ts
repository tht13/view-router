import * as express from "express";
import * as assert from "assert";
import { isNil } from "lodash";
import { join, extname } from "path";

export type ContextFunction<T extends {}> = (req: express.Request, res: express.Response) => Promise<T> | T;

export type PostFunction = (req: express.Request, res: express.Response) => Promise<void> | void;

const DEFAULT_CONFIG_PATH = "vrconfig.json";
const DEFAULT_REQUEST_TYPE = "GET";

class ViewRouter {
  private views: Map<[string, "GET" | "POST"], IViewConfig> = new Map();
  public static path: string = process.cwd();

  constructor(views: IViewConfig[], private options: IViewRouterOptions = {}) {
    assert.ok(Array.isArray(views), "Views is not an array");
    for (const view of views) {
      if (isNil(view.requestType)) {
        view.requestType = DEFAULT_REQUEST_TYPE;
      } else {
        switch (view.requestType.toUpperCase()) {
          case "GET":
          case "POST":
            view.requestType = view.requestType.toUpperCase() as any;
            break;
          default:
            view.requestType = DEFAULT_REQUEST_TYPE;
        }
      }
      assert.ok(view.id, "View has no id");
      assert.ok(view.urlPath, "View has no url path");
      if (view.urlPath.constructor === Array) {
        for (const path of view.urlPath) {
          assert.equal(this.views.has([path, view.requestType]), false);
          this.views.set([path, view.requestType], view);
        }
      } else {
        assert.equal(this.views.has([view.urlPath as string, view.requestType]), false);
        this.views.set([view.urlPath as string, view.requestType], view);
      }
    }
  }

  private checkRequestType(type: string): boolean {
    return type === "GET" || type === "POST";
  }

  public async handle(req: express.Request, res: express.Response, next: express.NextFunction) {
    const requestType = req.method as any;
    const view = this.views.get([req.path, requestType]);
    if (!isNil(view) && this.checkRequestType(requestType)) {
      if (view.requestType === "GET") {
        await this.getView(req, res, view);
      } else {
        await this.handlePOST(req, res, view);
      }
    }
    next();
  }

  private async getView(req: express.Request, res: express.Response, viewConfig: IViewConfig): Promise<void> {
    let contextImport: IViewConstructor<{}> | ContextFunction<{}> = null;
    try {
      contextImport = require(ViewRouter.getPath(
        isNil(viewConfig.viewHandlerPath) ? viewConfig.id : viewConfig.viewHandlerPath
      )).default;
    } catch (e) {
      console.warn(`Failed to import ${viewConfig.id}`);
    }

    const context = await ((isNil(contextImport)) ?
      this.getDefaultView(req, res) :
      (contextImport.prototype.constructor === contextImport) ?
        this.handleAsClass(contextImport as IViewConstructor<{}>, req, res) :
        this.handleAsFunction(contextImport as ContextFunction<{}>, req, res));

    return new Promise<void>((resolve, reject) => {
      res.render((isNil(viewConfig.layout)) ? viewConfig.id : viewConfig.layout, context, (err, html) => {
        if (err) {
          return reject(err);
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
        resolve();
      });
    });
  }

  private async handleAsClass(viewConstructor: IViewConstructor<{}>, req: express.Request, res: express.Response): Promise<{}> {
    const view: IView<{}> = new viewConstructor(req, res);
    if (!isNil(view.checkRouteValid) && await !view.checkRouteValid()) {
      // TODO add better clause, throw specific error
      // res.end();
      return {};
    }
    if (!isNil(this.options.basicContentGenerator) && !isNil(view.setBasicContext)) {
      view.setBasicContext(this.options.basicContentGenerator(req, res));
    }
    return view.getContext();
  }

  private async handleAsFunction(handlerFunction: ContextFunction<{}>, req: express.Request, res: express.Response): Promise<{}> {
    return handlerFunction(req, res);
  }

  private getDefaultView(req: express.Request, res: express.Response): IView<{}> {
    return {
      getContext: () => Promise.resolve(
        (isNil(this.options.basicContentGenerator)) ? {} : this.options.basicContentGenerator(req, res)
      ),
      setBasicContext: ctx => void 0,
      checkRouteValid: () => Promise.resolve(true)
    };
  }

  private async handlePOST(req: express.Request, res: express.Response, viewConfig: IViewConfig) {
    let contextImport: IHandlerConstructor | PostFunction = null;
    try {
      contextImport = require(ViewRouter.getPath(
        isNil(viewConfig.viewHandlerPath) ? viewConfig.id : viewConfig.viewHandlerPath
      )).default;
    } catch (e) {
      console.warn(`Failed to import ${viewConfig.id}`);
    }

    await ((isNil(contextImport)) ?
      this.getDefaultHandler() :
      (contextImport.prototype.constructor === contextImport) ?
        new (contextImport as IHandlerConstructor)(req, res).handle() :
        (contextImport as PostFunction)(req, res));

  }

  private getDefaultHandler(): IHandler {
    return {
      handle: () => {
        return Promise.resolve();
      }
    };
  }

  public static getPath(subpath: string): string {
    return join(this.path, subpath);
  }
}

/**
 * A middle-ware function for express to handle routing of views through a 
 * template engine
 * 
 * @export
 * @param {IViewRouterOptions} [options] An options configuration
 * @returns {(req: express.Request, res: express.Response, next: express.NextFunction) => void}
 */
export function viewRouter(options?: IViewRouterOptions): (req: express.Request, res: express.Response, next: express.NextFunction) => void;
/**
 * A middle-ware function for express to handle routing of views through a 
 * template engine
 * 
 * @export
 * @param {IViewConfig[]} views A array of routes to connect
 * @param {IViewRouterOptions} [options] An options configuration
 * @returns {(req: express.Request, res: express.Response, next: express.NextFunction) => void}
 */
export function viewRouter(views: IViewConfig[], options?: IViewRouterOptions): (req: express.Request, res: express.Response, next: express.NextFunction) => void;
export function viewRouter(views: IViewConfig[], options?: IViewRouterOptions): (req: express.Request, res: express.Response, next: express.NextFunction) => void {
  if (!Array.isArray(views)) {
    options = views;
    views = undefined;
  }
  if (!isNil(options) && !isNil(options.basePath)) {
    ViewRouter.path = options.basePath;
  }
  if (isNil(views)) {
    let configReadPath: string = (!isNil(options) && !isNil(options.configFilePath)) ? options.configFilePath : DEFAULT_CONFIG_PATH;
    assert.equal(extname(configReadPath), ".json", "Not a json file");

    views = require(ViewRouter.getPath(configReadPath));
  }

  const vr = new ViewRouter(views, options);
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    vr.handle(req, res, next);
  };
}

export default viewRouter;

// TODO use tsc cmdline to concat .d.ts into one file
/**
 * An interface for view handlers to export to `view-router`
 * 
 * 
 * @export
 * @interface IView
 * @template {T extends {}} The context type to be returned for rendering in the view engine
 */
export interface IView<T extends {}> {
  /**
   * An optional method to implement, called at the beginning of the handle action.
   * Used to determine if the current user's state is legal for the
   * requested action.
   * 
   * @returns {(Promise<boolean> | boolean)} A boolean signifiying if the route is legal
   * 
   * @memberof IView
   */
  checkRouteValid?(): Promise<boolean> | boolean;
  /**
   * Returns the object with which to build the registered template.
   * 
   * @returns {(Promise<T> | T)}
   * 
   * @memberof IView
   */
  getContext(): Promise<T> | T;
  /**
   * An optional method which allows setting a common context to all views (i.e the server root url)
   * 
   * @param {Partial<T>} ctx
   * 
   * @memberof IView
   */
  setBasicContext?(ctx: Partial<T>): void;
}

/**
 * The constructor to be exported to build the IView object
 * 
 * @export
 * @interface IViewConstructor
 * @template T extends {}
 */
export interface IViewConstructor<T extends {}> {
  new (req: express.Request, res: express.Response): IView<T>;
}

/**
 * 
 * 
 * @export
 * @interface IHandlerConstructor
 */
export interface IHandlerConstructor {
  new (req: express.Request, res: express.Response): IHandler;
}

/**
 * 
 * 
 * @export
 * @interface IHandler
 */
export interface IHandler {
  /**
   * 
   * 
   * @returns {Promise<void>}
   * 
   * @memberof IHandler
   */
  handle(): Promise<void>;
}

/**
 * A configuration object for defining views
 * 
 * @export
 * @interface IViewConfig
 */
export interface IViewConfig {
  /**
   * 
   * 
   * @type {string}
   * @memberof IViewConfig
   */
  id: string;
  /**
   * 
   * 
   * @type {(string | string[])}
   * @memberof IViewConfig
   */
  urlPath: string | string[];
  /**
   * 
   * 
   * @type {string}
   * @memberof IViewConfig
   */
  layout?: string;
  /**
   * 
   * 
   * @type {string}
   * @memberof IViewConfig
   */
  viewHandlerPath?: string;
  /**
   * The HTTP request type, defaults to GET
   * 
   * @type {"GET" | "POST"}
   * @memberof IViewConfig
   */
  requestType?: "GET" | "POST";
}

/**
 * A options object for initialising `view-router`
 * 
 * @export
 * @interface IViewRouterOptions
 */
export interface IViewRouterOptions {
  /**
   * The base path to find view handlers from
   * Defaults to `process.cwd()`
   * 
   * @type {string}
   * @memberof IViewRouterOptions
   */
  basePath?: string;
  /**
   * A `.json` file to load which contains the `IViewConfig` definitions.
   * Defaults to `vrconfig.json`.
   * Only used if a `IViewConfig[]` is not passed as the first arguement when
   * initialising `view-router`.
   * 
   * @type {string}
   * @memberof IViewRouterOptions
   */
  configFilePath?: string;
  /**
   * A function called to supply a common context to all views which
   * implement the `IView#setBasicContext` method.
   * 
   * 
   * @memberof IViewRouterOptions
   */
  basicContentGenerator?: (req?: express.Request, res?: express.Response) => any;
}
