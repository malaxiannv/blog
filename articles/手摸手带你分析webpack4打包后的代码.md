webpack最大的作用就是可以把模块化开发的代码打包成浏览器能够解析的代码，那webpack是如何实现这个功能的呢？我们从打包后的代码中分析一下实现原理。

## 准备工作，从最简单的版本开始：

1.新建一个空文件夹，执行npm init，创建一个package.json文件

2.执行`npm install --save-dev webpack`以及`npm install --save-dev webpack-cli`安装webpack4

3.创建项目文件

```
//index.html
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
<div id="app"></div>
<!--导入 Webpack 输出的 JavaScript 文件-->
<script src="./dist/bundle.js"></script>
</body>
</html>

//main.js
const show = require('./show.js')
show('Webpack')

//show.js
function show(content) {
  window.document.getElementById('app').innerText = 'Hello,' + content
}

module.exports = show

//webpack.config.js
const path = require('path');

module.exports = {
  entry: './main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './dist'),
  },
  mode: 'development'
};
```

4.给package.json文件添加脚本`"start": "webpack --config webpack.config.js"`，然后执行npm start，会生成一个bundle.js文件，接下来我们就逐步分析这个bundle.js文件的内容。

## bundle.js文件

```
(function(modules) {
   	var installedModules = {};
  
   	function __webpack_require__(moduleId) {
  
   		if(installedModules[moduleId]) {
   			return installedModules[moduleId].exports;
   		}

   		var module = installedModules[moduleId] = {
   			i: moduleId,
   			l: false,
   			exports: {}
   		};
  
   		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
   		module.l = true;
   		return module.exports;
   	}
  
  
   	__webpack_require__.m = modules;
  
   	// expose the module cache
   	__webpack_require__.c = installedModules;
  
   	// define getter function for harmony exports
   	__webpack_require__.d = function(exports, name, getter) {
   		if(!__webpack_require__.o(exports, name)) {
   			Object.defineProperty(exports, name, { enumerable: true, get: getter });
   		}
   	};
  
   	// define __esModule on exports
   	__webpack_require__.r = function(exports) {
   		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
   			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
   		}
   		Object.defineProperty(exports, '__esModule', { value: true });
   	};
  
   
   	__webpack_require__.t = function(value, mode) {
   		if(mode & 1) value = __webpack_require__(value);
   		if(mode & 8) return value;
   		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
   		var ns = Object.create(null);
   		__webpack_require__.r(ns);
   		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
   		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
   		return ns;
   	};
  
   	// getDefaultExport function for compatibility with non-harmony modules
   	__webpack_require__.n = function(module) {
   		var getter = module && module.__esModule ?
   			function getDefault() { return module['default']; } :
   			function getModuleExports() { return module; };
   		__webpack_require__.d(getter, 'a', getter);
   		return getter;
   	};
  
   	// Object.prototype.hasOwnProperty.call
   	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
  
   	// __webpack_public_path__
   	__webpack_require__.p = "";
  
  
   	// Load entry module and return exports
   	return __webpack_require__(__webpack_require__.s = "./main.js");
   })({
        "./main.js":
        (function(module, exports, __webpack_require__) {
          eval("const show = __webpack_require__(/*! ./show.js */ \"./show.js\")\nshow('Webpack')\n\n//# sourceURL=webpack:///./main.js?");
        }),
        
        "./show.js":
        (function(module, exports) {
          eval("function show(content) {\n  window.document.getElementById('app').innerText = 'Hello,' + content\n}\n\nmodule.exports = show\n\n//# sourceURL=webpack:///./show.js?");
        })
   })
```

首先看下这个文件的简化版结构：

```
(function(modules) {
   	var installedModules = {};
  
   	function __webpack_require__(moduleId) {
      ...
    }
     
   	// Load entry module and return exports
   	return __webpack_require__(__webpack_require__.s = "./main.js");
   })({
       ...
   })
```

可以看到webpack打包出来的文件是一个立即执行函数，该函数的参数是一个对象，我们先看下这个对象参数是什么

```
{
        "./main.js":
        (function(module, exports, __webpack_require__) {
          eval("const show = __webpack_require__(/*! ./show.js */ \"./show.js\")\nshow('Webpack')\n\n//# sourceURL=webpack:///./main.js?");
        }),
        
        "./show.js":
        (function(module, exports) {
          eval("function show(content) {\n  window.document.getElementById('app').innerText = 'Hello,' + content\n}\n\nmodule.exports = show\n\n//# sourceURL=webpack:///./show.js?");
        })
}
```

可以看到webpack把各个JS文件的信息存入了一个对象中，对象的属性是这些JS文件的相对路径，比如'./main.js'，属性值是一个函数，执行该函数，就会把该JS文件中的代码eval执行出来。

接下来逐步解析webpack编译出来的这个大函数

```
function(modules) {
   	var installedModules = {};
  
   	function __webpack_require__(moduleId) {
      ...
    }
     
   	// Load entry module and return exports
   	return __webpack_require__(__webpack_require__.s = "./main.js");
   }
```

其中这个modules参数就是上面分析的那个对象，installedModules用于存放已加载过的module信息，这个函数的返回值是`__webpack_require__("./main.js")`，可见`__webpack_require__`函数中的moduleId就是文件的相对路径，要想知道这个函数最终的返回值是什么，还要详细解析`__webpack_require__`函数。

```
function __webpack_require__(moduleId) {
  
   		if(installedModules[moduleId]) {
   			return installedModules[moduleId].exports;
   		}

   		var module = installedModules[moduleId] = {
   			i: moduleId,
   			l: false,
   			exports: {}
   		};
  
   		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
   		module.l = true;
   		return module.exports;
   	}
```

这个函数的逻辑还是很简单的，首先判断'./main.js'这个模块是否已经加载过，如果加载过，就直接返回缓存值`installedModules[moduleId].exports`，如果未加载过，就新创建一个module对象，并把这个对象值缓存。

modules[moduleId]的值是个函数，比如modules['./main.js']的值如下：

```
function(module, exports, __webpack_require__) {
          eval("const show = __webpack_require__(/*! ./show.js */ \"./show.js\")\nshow('Webpack')\n\n//# sourceURL=webpack:///./main.js?");
 }
```

执行`modules[moduleId].call(module.exports, module, module.exports, __webpack_require__)`，就是执行上面那个函数，我们详细看下eval中的值：

```
const show = __webpack_require__(/*! ./show.js */ \"./show.js\")
show('Webpack')
```

可以看到eval要执行的代码其实就是文章开头我们创建的main.js中的代码，先看第一句，递归的调用了`__webpack_require__("./show.js\")`，又进入了`__webpack_require__`函数中，因为这个模块还未被加载过，因此会创建一个新的module，moduleId就是'./show.js'，接下来调用函数modules['./show.js']，进入到show.js中的eval函数中

```
function(module, exports) {
          eval("function show(content) {\n  window.document.getElementById('app').innerText = 'Hello,' + content\n}\n\nmodule.exports = show\n\n//# sourceURL=webpack:///./show.js?");
}

//eval语句
function show(content) {
  window.document.getElementById('app').innerText = 'Hello,' + content
}

module.exports = show
```

执行完eval语句，'./show.js'这个module对象的exports属性值就show函数了，`__webpack_require__('./show.js')`函数中最后一句是`return module.exports`，表示返回一个show函数，因此这条语句`const show = __webpack_require__(/*! ./show.js */ \"./show.js\")`得到的show变量就是show.js中定义的show方法。接下来执行`show('Webpack')`，window中id为app的DOM元素内部就加上了'Hello, Webpack'。

接下来看`__webpack_require__(moduleId)`函数中的下一句`module.l = true`，给module模块的l属性值设为true，这个属性用来标识当前模块中的代码已经解析完毕，最后一句`return module.exports`，因为main.js中没有对这个变量赋值，因此`__webpack_require__('./main.js')`函数的返回值是一个空对象，也就是说整体的webpack立即函数的函数值是一个空对象，因为最后一句是`return __webpack_require__(__webpack_require__.s = "./main.js")`。

至此webpack的主体结构我们就分析完毕了，我们来做个总结，webpack打包出来的函数是一个立即执行函数，这个函数的参数是一个对象，对象中存放着各个JS文件的信息，webpack会把文件之间的依赖require替换成自定义的` __webpack_require__`函数，在这个函数中会返回module.exports的返回值，这就是webpack打包CommonJS模块的流程。

## 异步打包模块的实现机制

webpack中提供一个import函数，用来异步加载模块，我们修改一下main.js文件和index.html文件，给页面中添加一个按钮，点击按钮时才加载show.js文件：

```
// index.html
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
<button id="btn">点击我</button>
<!--导入 Webpack 输出的 JavaScript 文件-->
<script src="./bundle.js"></script>
</body>
</html>

// main.js
document.getElementById('btn').addEventListener('click', function () {
  import(/* webpackChunkName: "show" */ './show').then((show) =>{
    show('Webpack')
  })
})
```

再次执行npm start，查看打包文件，发现有两个，一个是bundle.js，一个是show.bundle.js，我们首先来看看show.bundle.js是什么：

```
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["show"],{
  "./show.js":
  (function(module, exports) {
  eval("function show(content) {\n  window.document.getElementById('app').innerText = 'Hello,' + content\n}\n\nmodule.exports = show\n\n//# sourceURL=webpack:///./show.js?");
  })
}])
```

一开始全局对象window中是不存在webpackJsonp属性的，因此一开始window["webpackJsonp"]会被赋值为一个空数组，之后执行push方法，把show文件的信息push进去，这段代码执行完毕，window["webpackJsonp"]的值就如下所示：

```
[
  [
    ["show"],
    {
      "./show.js":
      (function(module, exports) {
      eval("function show(content) {\n  window.document.getElementById('app').innerText = 'Hello,' + content\n}\n\nmodule.exports = show\n\n//# sourceURL=webpack:///./show.js?");
      })
    }
  ]
]
```

接着我们再看bundle.js的代码：

```
 (function(modules) { // webpackBootstrap
 	// install a JSONP callback for chunk loading
 	function webpackJsonpCallback(data) {
 		var chunkIds = data[0];
 		var moreModules = data[1];

 		// add "moreModules" to the modules object,
 		// then flag all "chunkIds" as loaded and fire callback
 		var moduleId, chunkId, i = 0, resolves = [];
 		for(;i < chunkIds.length; i++) {
 			chunkId = chunkIds[i];
 			if(installedChunks[chunkId]) {
 				resolves.push(installedChunks[chunkId][0]);
 			}
 			installedChunks[chunkId] = 0;
 		}
 		for(moduleId in moreModules) {
 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
 				modules[moduleId] = moreModules[moduleId];
 			}
 		}
 		if(parentJsonpFunction) parentJsonpFunction(data);

 		while(resolves.length) {
 			resolves.shift()();
 		}
 	};


 	// The module cache
 	var installedModules = {};

 	// object to store loaded and loading chunks
 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
 	// Promise = chunk loading, 0 = chunk loaded
 	var installedChunks = {
 		"main": 0
 	};



 	// script path function
 	function jsonpScriptSrc(chunkId) {
 		return __webpack_require__.p + "" + chunkId + ".bundle.js"
 	}

 	// The require function
 	function __webpack_require__(moduleId) {

 		// Check if module is in cache
 		if(installedModules[moduleId]) {
 			return installedModules[moduleId].exports;
 		}
 		// Create a new module (and put it into the cache)
 		var module = installedModules[moduleId] = {
 			i: moduleId,
 			l: false,
 			exports: {}
 		};

 		// Execute the module function
 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

 		// Flag the module as loaded
 		module.l = true;

 		// Return the exports of the module
 		return module.exports;
 	}

 	// This file contains only the entry chunk.
 	// The chunk loading function for additional chunks
 	__webpack_require__.e = function requireEnsure(chunkId) {
 		var promises = [];


 		// JSONP chunk loading for javascript

 		var installedChunkData = installedChunks[chunkId];
 		if(installedChunkData !== 0) { // 0 means "already installed".

 			// a Promise means "currently loading".
 			if(installedChunkData) {
 				promises.push(installedChunkData[2]);
 			} else {
 				// setup Promise in chunk cache
 				var promise = new Promise(function(resolve, reject) {
 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
 				});
 				promises.push(installedChunkData[2] = promise);

 				// start chunk loading
 				var script = document.createElement('script');
 				var onScriptComplete;

 				script.charset = 'utf-8';
 				script.timeout = 120;
 				if (__webpack_require__.nc) {
 					script.setAttribute("nonce", __webpack_require__.nc);
 				}
 				script.src = jsonpScriptSrc(chunkId);

 				onScriptComplete = function (event) {
 					// avoid mem leaks in IE.
 					script.onerror = script.onload = null;
 					clearTimeout(timeout);
 					var chunk = installedChunks[chunkId];
 					if(chunk !== 0) {
 						if(chunk) {
 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
 							var realSrc = event && event.target && event.target.src;
 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
 							error.type = errorType;
 							error.request = realSrc;
 							chunk[1](error);
 						}
 						installedChunks[chunkId] = undefined;
 					}
 				};
 				var timeout = setTimeout(function(){
 					onScriptComplete({ type: 'timeout', target: script });
 				}, 120000);
 				script.onerror = script.onload = onScriptComplete;
 				document.head.appendChild(script);
 			}
 		}
 		return Promise.all(promises);
 	};


 	// define getter function for harmony exports
 	__webpack_require__.d = function(exports, name, getter) {
 		if(!__webpack_require__.o(exports, name)) {
 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
 		}
 	};

 	// define __esModule on exports
 	__webpack_require__.r = function(exports) {
 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
 		}
 		Object.defineProperty(exports, '__esModule', { value: true });
 	};

 	// create a fake namespace object
 	// mode & 1: value is a module id, require it
 	// mode & 2: merge all properties of value into the ns
 	// mode & 4: return value when already ns object
 	// mode & 8|1: behave like require
 	__webpack_require__.t = function(value, mode) {
 		if(mode & 1) value = __webpack_require__(value);
 		if(mode & 8) return value;
 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
 		var ns = Object.create(null);
 		__webpack_require__.r(ns);
 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
 		return ns;
 	};

 	// getDefaultExport function for compatibility with non-harmony modules
 	__webpack_require__.n = function(module) {
 		var getter = module && module.__esModule ?
 			function getDefault() { return module['default']; } :
 			function getModuleExports() { return module; };
 		__webpack_require__.d(getter, 'a', getter);
 		return getter;
 	};

 	// Object.prototype.hasOwnProperty.call
 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

 	// __webpack_public_path__
 	__webpack_require__.p = "";

 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
 	jsonpArray.push = webpackJsonpCallback;
 	jsonpArray = jsonpArray.slice();
 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
 	var parentJsonpFunction = oldJsonpFunction;


 	// Load entry module and return exports
 	return __webpack_require__(__webpack_require__.s = "./main.js");
 })
 ({

  "./main.js":
  (function(module, exports, __webpack_require__) {
    eval("window.document.getElementById('btn').addEventListener('click', function () {\n  __webpack_require__.e(/*! import() | show */ \"show\").then(__webpack_require__.t.bind(null, /*! ./show */ \"./show.js\", 7)).then((show) => {\n    show('Webpack')\n  })\n})\n\n//# sourceURL=webpack:///./main.js?");
    })
   });
```

这个文件也是一个立即执行函数，首先看下这个文件中很巧妙的一段代码

```
//把全局变量window["webpackJsonp"]赋值给jsonpArray，初始的时候，这个值是空数组
var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
//用oldJsonpFunction保存数组原生的push方法，并把这个方法绑定到全局对象window["webpackJsonp"]上
var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
//劫持原生的push方法，因为jsonpArray和window["webpackJsonp"]是同一个引用，因此在show.js中执行的
//window["webpackJsonp"].push()方法其实执行的是webpackJsonpCallback方法
jsonpArray.push = webpackJsonpCallback; 
//创建一个新的数组，保留了数据，但是切断了jsonpArray和window["webpackJsonp"]的引用
jsonpArray = jsonpArray.slice();
//遍历jsonpArray数组，这里也会触发webpackJsonpCallback的调用
for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
var parentJsonpFunction = oldJsonpFunction;//把上面原生的push方法赋值给parentJsonpFunction
```

因为bundle.js是最先加载进来的，因此上面这一段代码执行的时候，jsonpArray还是空数组，当点击页面上的按钮，把show.js加载进来后，会执行`window["webpackJsonp"].push()`，此时才会调用webpackJsonpCallback函数，接下来我们详细看下定义在bundle.js中的webpackJsonpCallback是什么样子的：

```
// install a JSONP callback for chunk loading
  function webpackJsonpCallback(data) {
    var chunkIds = data[0]; 
    var moreModules = data[1]; 

    // add "moreModules" to the modules object,
    // then flag all "chunkIds" as loaded and fire callback
    var moduleId, chunkId, i = 0, resolves = [];
    for(;i < chunkIds.length; i++) {
      chunkId = chunkIds[i]; 
      if(installedChunks[chunkId]) {
        resolves.push(installedChunks[chunkId][0]);
      }
      installedChunks[chunkId] = 0;
    }
    for(moduleId in moreModules) {
      if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
        modules[moduleId] = moreModules[moduleId]; 
      }
    }
    if(parentJsonpFunction) parentJsonpFunction(data);

    while(resolves.length) {
      resolves.shift()();
    }
  };
```

此处传进webpackJsonpCallback函数中的data如下所示：

```
  [
    ["show"],
    {
      "./show.js":
      (function(module, exports) {
      eval("function show(content) {\n  window.document.getElementById('app').innerText = 'Hello,' + content\n}\n\nmodule.exports = show\n\n//# sourceURL=webpack:///./show.js?");
      })
    }
  ]
```

按照这个参数，我们继续解析webpackJsonpCallback函数

```
function webpackJsonpCallback(data) {
    var chunkIds = data[0]; // ["show"]这里的数组中可能有多个元素，比如多个异步组件打包到一个js文件中
    var moreModules = data[1]; // {"./show.js": function(){eval()}}

    // add "moreModules" to the modules object,
    // then flag all "chunkIds" as loaded and fire callback
    var moduleId, chunkId, i = 0, resolves = [];
    for(;i < chunkIds.length; i++) {
      chunkId = chunkIds[i]; //文件名"show"
      if(installedChunks[chunkId]) {//如果chunk正在loading
        resolves.push(installedChunks[chunkId][0]);
      }
      installedChunks[chunkId] = 0;//标识已经加载结束
    }
    for(moduleId in moreModules) {
      if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
        modules[moduleId] = moreModules[moduleId]; //把moreModules对象中的属性值添加到modules中
      }
    }
    //这一句才是把data push到window["webpackJsonp"]全局对象中
    if(parentJsonpFunction) parentJsonpFunction(data);
    while(resolves.length) {
      resolves.shift()();//把resolves中的函数都调用了
    }
  };
```

可见webpackJsonpCallback函数的作用是把各个需要异步加载的模块加载进来，把模块信息存入modules对象中，并把模块数据push进全局对象中，并执行各个模块中的函数。

看到这里，你可能会有疑问，installedChunks[chunkId]是什么时候被赋值为pending的，我们看一下bundle.js中初始状态下，installedChunks的值是什么：

```
  // object to store loaded and loading chunks
  // undefined = chunk not loaded, null = chunk preloaded/prefetched
  // Promise = chunk loading, 0 = chunk loaded
  var installedChunks = {
    "main": 0
  };
```

可以看到，最开始的时候，只有main模块被加载进来了，我们来一步步看一下，因为bundle.js这个自执行函数的最后一句是`return __webpack_require__(__webpack_require__.s = "./main.js")`，上一节我们已经分析过`__webpack_require__`这个函数，执行` __webpack_require__("./main.js")`会eval如下语句：

```
  document.getElementById('btn').addEventListener('click', function () {
    __webpack_require__.e("show")
      .then(__webpack_require__.t.bind(null, "./show.js", 7))
      .then((show) => {
      show('Webpack')
    })
  })
```

因此点击页面上的按钮，会先执行`__webpack_require__.e("show")`，我们来分析`__webpack_require__.e`函数是如何定义的：

```
  __webpack_require__.e = function requireEnsure(chunkId) {//chunkId是"show"
    var promises = [];
    // JSONP chunk loading for javascript
    var installedChunkData = installedChunks[chunkId];//初始时是undefined
    if(installedChunkData !== 0) { // 0 means "already installed".

      // a Promise means "currently loading".
      if(installedChunkData) {
        promises.push(installedChunkData[2]);
      } else {
        // setup Promise in chunk cache 
        // 新建一个Promise对象，并把这个Promise对象的resolve，reject参数赋值给installedChunkData
        var promise = new Promise(function(resolve, reject) {
          installedChunkData = installedChunks[chunkId] = [resolve, reject];
        });
        promises.push(installedChunkData[2] = promise);//push进去的数据是[resolve, reject, promise]

        // start chunk loading 创建src标签，设置好属性和src
        var script = document.createElement('script');
        var onScriptComplete;
        script.charset = 'utf-8';
        script.timeout = 120;
        if (__webpack_require__.nc) {//如果设置了webpack命名空间namespace
          script.setAttribute("nonce", __webpack_require__.nc);
        }
        script.src = jsonpScriptSrc(chunkId);

        onScriptComplete = function (event) {
          // avoid mem leaks in IE.
          script.onerror = script.onload = null;
          clearTimeout(timeout);
          var chunk = installedChunks[chunkId];// [resolve, reject, promise]
          if(chunk !== 0) {//如果chunk不是0，说明该模块没有被成功加载，就需要抛出错误
            if(chunk) {
              var errorType = event && (event.type === 'load' ? 'missing' : event.type);//timeout
              var realSrc = event && event.target && event.target.src;
              var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
              error.type = errorType;
              error.request = realSrc;
              chunk[1](error);
            }
            installedChunks[chunkId] = undefined;//设置成undefined，表明chunk not loaded
          }
        };

        //120s之后调用onScriptComplete函数，并传入参数{ type: 'timeout', target: script }，设置120s是为了保证文件能百分百加载完毕
        var timeout = setTimeout(function(){
          onScriptComplete({ type: 'timeout', target: script });
        }, 120000);

        script.onerror = script.onload = onScriptComplete; //给script对象添加onerror，onload函数
        document.head.appendChild(script);//把创建好的script标签插入head标签中
      }
    }
    return Promise.all(promises);
  }
```

从外向内拆解这个函数，先看总体结构：

```

```

参考链接：https://juejin.im/entry/5c3a220d6fb9a049ae081fc5