const http = require('http')
const path = require('path')
const url = require('url')
const fs = require('fs')
const mime = require('mime')

// 静态资源目录
const staticPath = "/public/"
// 定义Expires规则
const Expires = {
  fileMatch: /(gif|png|jpg|js|css)$/ig,
  maxAge: 60 * 60 * 24 * 365
};

const app = http.createServer((req, res) => {
  
  const pathname = url.parse(req.url).pathname
  const extname = path.extname(req.url)
  const filePath = path.join(__dirname, staticPath, pathname)
  const isFile = fs.existsSync(filePath)

  if (!pathname.indexOf('favicon.ico')) {
    return; 
  };
  // 文件不存在返回404
  if(!isFile) {
    send404(res, pathname)
    return
  }  
  
  fs.readFile(filePath, (err, file) => {
    if (err) {
      // 文件读取出错
      res.writeHead(500, {"Content-Type": "text/plain"})
      res.end(err)
      return
    } else {
      // Expires 和 Cache-Control 强缓存
      if (extname.match(Expires.fileMatch)) {
        let expires = new Date();
        expires.setTime(expires.getTime() + Expires.maxAge * 1000);
        // res.setHeader("Expires", expires.toUTCString());
        // res.setHeader("Cache-Control", "max-age=" + Expires.maxAge);
        // res.setHeader("Cache-Control", "no-cache");
        // res.setHeader("Cache-Control", "no-store");
      }

      // Last-Modified / If-Modified-Since 协商缓存
      // let stat = fs.statSync(filePath)
      // let lastModified = stat.mtime.toUTCString()
      // res.setHeader("Last-Modified", lastModified)
      // if (req.headers["if-modified-since"] && lastModified == req.headers["if-modified-since"]) {
      //   res.writeHead(304, "Not Modified");
      //   res.end();
      //   return;
      // }

      // // Etag  if-none-match 协商缓存
      // let hashStr = fs.statSync(filePath).mtime.toUTCString()
      // let hash = crypto.createHash('sha1').update(hashStr).digest('base64')
      // if(req.headers['if-none-match'] == hash){
      //   res.writeHead(304, "Not Modified");
      //   res.end();
      //   return
      // }
      // res.setHeader("Etag", hash);

      // 正常写文件
      res.writeHead(200, {"Content-Type": mime.getType(extname) })
      res.write(file, "binary")
      res.end()
      return
    }
  })

  // res.end(fs.existsSync(pathname));
})

app.listen(3000, () => {
  console.log('listening on port 3000')
})

function send404(res, pathname) {
  res.writeHead(404, {"Content-Type": "text/plain"})
  res.end(`${pathname} is not found !`)
}

// Expires / Cache-Control: max-age=xxxx：设置文件的最大缓存时间。
// Last-Modified / If-Modified-Since：把浏览器端文件缓存的最后修改时间一起发到服务器去，服务器会把这个时间与服务器上实际文件的最后修改时间进行比较。如果没有修改，则返回304状态码。
// ETag头：用来判断文件是否已经被修改，区分不同语言和Session等等。