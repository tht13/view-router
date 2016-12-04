import * as express from "express";
import * as assert from "assert";
import { isNil } from "lodash";
import { join } from "path";

export type ContextFunction = (req: express.Request, res: express.Response) => Promise<{}> | {};
export interface IView {
  checkRouteValid?(): Promise<boolean> | boolean;
  getContext(): Promise<{}> | {};
  setBasicContext(ctx: {}): void;
}

export interface IViewConstructor {
  new (req: express.Request, res: express.Response): IView;
}

export interface IViewConfig {
  id: string;
  urlPath: string | string[];
  layout?: string;
  viewHandlerPath?: string;
}

export interface IViewRouterOptions {
  basePath?: string;
  basicContentGenerator?: (req?: express.Request, res?: express.Response) => any;
}

class ViewRouter {
  private views: Map<string, IViewConfig> = new Map();
  private path: string = "";
  constructor(views: IViewConfig[], private options: IViewRouterOptions = {}) {
    for (const view of views) {
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
    if (!isNil(options.basePath)) { 
      this.path = options.basePath;
    }
  }

  public async handle(req: express.Request, res: express.Response, next: express.NextFunction) {
    const view = this.views.get(req.path);
    await this.getView(req, res, view);
    next();
  }

  private async getView(req: express.Request, res: express.Response, viewConfig: IViewConfig): Promise<void> {
    let contextImport: IViewConstructor | ContextFunction = null;
    if (!isNil(viewConfig.viewHandlerPath)) {
      contextImport = require(join(this.path, viewConfig.viewHandlerPath)).default;
    }

    const context = await (contextImport instanceof Function) ?
      this.handleAsFunction(contextImport as ContextFunction, req, res) :
      this.handleAsClass(contextImport as IViewConstructor, req, res);

    res.render((isNil(viewConfig.layout)) ? viewConfig.id : viewConfig.layout, context)
  }

  private async handleAsClass(viewConstructor: IViewConstructor, req: express.Request, res: express.Response): Promise<{}> {
    const view: IView = (isNil(viewConstructor)) ? this.getDefaultView(req, res) : new viewConstructor(req, res);
    if (!isNil(view.checkRouteValid) && await !view.checkRouteValid()) {
      res.end();
      return {};
    }
    if (!isNil(this.options.basicContentGenerator)) {
      view.setBasicContext(this.options.basicContentGenerator(req, res));
    }
    return view.getContext();
  }

  private async handleAsFunction(handlerFunction: ContextFunction, req: express.Request, res: express.Response): Promise<{}> {
    return handlerFunction(req, res);
  }

  private getDefaultView(req: express.Request, res: express.Response): IView {
    return {
      getContext: () => Promise.resolve(
        (isNil(this.options.basicContentGenerator)) ? void 0 : this.options.basicContentGenerator(req, res)
      ),
      setBasicContext: ctx => void 0,
      checkRouteValid: () => Promise.resolve(true)
    };
  }
}

export function viewRouter(views: IViewConfig[], options?: IViewRouterOptions) {
  const vr = new ViewRouter(views, options);
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    vr.handle(req, res, next);
  };
}

export default viewRouter;
