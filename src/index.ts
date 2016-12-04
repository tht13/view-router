import * as express from "express";
import * as assert from "assert";
import { isNil } from "lodash";

export interface IView {
  checkRouteValid?(): Promise<boolean>;
  getContext(): Promise<{}>;
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
  basicContectGenerator?: (req?: express.Request, res?: express.Response) => any;
}

class ViewRouter {
  private views: Map<string, IViewConfig> = new Map();
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
  }

  public async handle(req: express.Request, res: express.Response, next: express.NextFunction) {
    const view = this.views.get(req.path);
    await this.getView(req, res, view);
    next();
  }
  private async getView(req: express.Request, res: express.Response, viewConfig: IViewConfig): Promise<void> {
    let viewConstructor: IViewConstructor = null;
    if (!isNil(viewConfig.viewHandlerPath)) {
      viewConstructor = require(viewConfig.viewHandlerPath).default;
    }
    const view: IView = (isNil(viewConstructor)) ? this.getDefaultView(req, res) : new viewConstructor(req, res);
    if (!isNil(view.checkRouteValid) && await !view.checkRouteValid()) {
      res.end();
      return;
    }
    if (!isNil(this.options.basicContectGenerator)) {
      view.setBasicContext(this.options.basicContectGenerator(req, res));
    }
    view.getContext().then(v =>
      res.render((isNil(viewConfig.layout)) ? viewConfig.id : viewConfig.layout, v)
    );
  }
  private getDefaultView(req: express.Request, res: express.Response): IView {
    return {
      getContext: () => Promise.resolve(
        (isNil(this.options.basicContectGenerator)) ? void 0 : this.options.basicContectGenerator(req, res)
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
