import * as express from "express";
import * as assert from "assert";
import { isNil } from "lodash";
import { join, extname } from "path";

export type ContextFunction<T extends {}> = (req: express.Request, res: express.Response) => Promise<T> | T;
/**
 * 
 * 
 * @export
 * @interface IView
 * @template T extends {}
 */
export interface IView<T extends {}> {
  /**
   * 
   * 
   * @returns {(Promise<boolean> | boolean)}
   * 
   * @memberOf IView
   */
  checkRouteValid?(): Promise<boolean> | boolean;
  /**
   * 
   * 
   * @returns {(Promise<T> | T)}
   * 
   * @memberOf IView
   */
  getContext(): Promise<T> | T;
  /**
   * 
   * 
   * @param {Partial<T>} ctx
   * 
   * @memberOf IView
   */
  setBasicContext?(ctx: Partial<T>): void;
}

/**
 * 
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
 * @interface IViewConfig
 */
export interface IViewConfig {
  /**
   * 
   * 
   * @type {string}
   * @memberOf IViewConfig
   */
  id: string;
  /**
   * 
   * 
   * @type {(string | string[])}
   * @memberOf IViewConfig
   */
  urlPath: string | string[];
  /**
   * 
   * 
   * @type {string}
   * @memberOf IViewConfig
   */
  layout?: string;
  /**
   * 
   * 
   * @type {string}
   * @memberOf IViewConfig
   */
  viewHandlerPath?: string;
}

/**
 * 
 * 
 * @export
 * @interface IViewRouterOptions
 */
export interface IViewRouterOptions {
  /**
   * 
   * 
   * @type {string}
   * @memberOf IViewRouterOptions
   */
  basePath?: string;
  /**
   * 
   * 
   * @type {string}
   * @memberOf IViewRouterOptions
   */
  configFilePath?: string;
  /**
   * 
   * 
   * 
   * @memberOf IViewRouterOptions
   */
  basicContentGenerator?: (req?: express.Request, res?: express.Response) => any;
}

const DEFAULT_CONFIG_PATH = "vrconfig.json";

class ViewRouter {
  private views: Map<string, IViewConfig> = new Map();
  /**
   * 
   * 
   * @static
   * @type {string}
   * @memberOf ViewRouter
   */
  public static path: string = process.cwd();

  /**
   * Creates an instance of ViewRouter.
   * 
   * @param {IViewConfig[]} views
   * @param {IViewRouterOptions} [options={}]
   * 
   * @memberOf ViewRouter
   */
  constructor(views: IViewConfig[], private options: IViewRouterOptions = {}) {
    for (const view of views) {
      assert.ok(view.id, "View has no id");
      assert.ok(view.urlPath, "View has no url path");
      if (view.urlPath.constructor === Array) {
        for (const path of view.urlPath) {
          assert.equal(this.views.has(path), false);
          this.views.set(path, view);
        }
      } else {
        assert.equal(this.views.has(view.urlPath as string), false);
        this.views.set(view.urlPath as string, view);
      }
    }
  }

  /**
   * 
   * 
   * @param {express.Request} req
   * @param {express.Response} res
   * @param {express.NextFunction} next
   * 
   * @memberOf ViewRouter
   */
  public async handle(req: express.Request, res: express.Response, next: express.NextFunction) {
    const view = this.views.get(req.path);
    if (!isNil(view)) {
      await this.getView(req, res, view);
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

  /**
   * 
   * 
   * @static
   * @param {string} subpath
   * @returns {string}
   * 
   * @memberOf ViewRouter
   */
  public static getPath(subpath: string): string {
    return join(this.path, subpath);
  }
}

/**
 * 
 * 
 * @export
 * @param {IViewRouterOptions} [options]
 * @returns {(req: express.Request, res: express.Response, next: express.NextFunction) => void}
 */
export function viewRouter(options?: IViewRouterOptions): (req: express.Request, res: express.Response, next: express.NextFunction) => void;
/**
 * 
 * 
 * @export
 * @param {IViewConfig[]} views
 * @param {IViewRouterOptions} [options]
 * @returns {(req: express.Request, res: express.Response, next: express.NextFunction) => void}
 */
export function viewRouter(views: IViewConfig[], options?: IViewRouterOptions): (req: express.Request, res: express.Response, next: express.NextFunction) => void;
export function viewRouter(views: IViewConfig[], options?: IViewRouterOptions): (req: express.Request, res: express.Response, next: express.NextFunction) => void {
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
