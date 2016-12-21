# vRouter.js

A view router for express.js where a config file is passed in and routes are automatically setup to connect rendered viewlets


## Example Usage

### Hello World

**Layout**
```

```

**vrouter.json**
```json
[
  {
      "id": "hello_world",
      "urlPath": "/",
      "layout": "hello_world",
      "viewHandlerPath": "./helloWorldHandler"
  }
]
```

**hello_world.hbs**
```html
<html>
<body>
{{hello_world}}
</body>
</html>
```

**helloWorldHandler.js**
```JavaScript
class HelloWorld {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.ctx = {
      hello_world = "Hello World!"
    };
  }

  getContext() {
    return this.ctx;
  }
}
```

**server.js**
```JavaScript
import * as express from "express";
import * as hbs from "express-handlebars";
import * as vrouter from "view-router";

// Setup express
const app = express();

// Setup templating engine, in this case Handlebar.js
const hbs = hbs.create({
    extname: ".hbs",
    layoutsDir: __dirname
});
app.engine(".hbs", hbs.engine);
app.set("view engine", ".hbs");
app.set("views", __dirname);

// Connect the router
app.use(vrouter());

app.listen(3000, () => console.log("Serving on localhost:3000"));
```
