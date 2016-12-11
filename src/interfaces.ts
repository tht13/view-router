import * as express from "express";

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
   * @memberOf IView
   */
  checkRouteValid?(): Promise<boolean> | boolean;
  /**
   * Returns the object with which to build the registered template.
   * 
   * @returns {(Promise<T> | T)}
   * 
   * @memberOf IView
   */
  getContext(): Promise<T> | T;
  /**
   * An optional method which allows setting a common context to all views (i.e the server root url)
   * 
   * @param {Partial<T>} ctx
   * 
   * @memberOf IView
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
   * @memberOf IViewRouterOptions
   */
  basePath?: string;
  /**
   * A `.json` file to load which contains the `IViewConfig` definitions.
   * Defaults to `vrconfig.json`.
   * Only used if a `IViewConfig[]` is not passed as the first arguement when
   * initialising `view-router`.
   * 
   * @type {string}
   * @memberOf IViewRouterOptions
   */
  configFilePath?: string;
  /**
   * A function called to supply a common context to all views which
   * implement the `IView#setBasicContext` method.
   * 
   * 
   * @memberOf IViewRouterOptions
   */
  basicContentGenerator?: (req?: express.Request, res?: express.Response) => any;
}
