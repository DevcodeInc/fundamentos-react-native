const express = require('express'),
app = express(),
ip = require('ip'),
colors = require('colors'),
_ = require('lodash'),
moment = require('moment'),
jwt = require('jsonwebtoken'),
multer  = require('multer'),
storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '.' + mime.extension(file.mimetype));
  }
}),
upload = multer({ storage: storage }),
md5 = require('md5'),
mime = require('mime'),
fs = require('fs'),
cors = require('cors')


// Configuracion, si deseas puedes editar esto
const _CONFIG = {
  listen_ip: ip.address(),
  listen_port: 8080,
  jwt_hash: "$%$DEVCODE$%$"
}

// Este proyecto no esta considerando usar un sistema de base de datos
// por motivos de simpleza, por lo que guardaremos los datos en variables
var _msgs = []
var _users = []

// Esta funcion nos ayudara a guardar los mensajes en su respectiva variable
// siguiendo siempre la misma estructura por cada registro
function addMsg(user_email,msg_type,msg_content){
  let m = {
    user: user_email,
    type: msg_type,
    content: msg_content,
    timestamp: moment().valueOf()
  }
  _msgs.push(m)
  return m;
}

// Esta funcion nos ayudara a registrar usuarios en su respectiva variable
// siguiendo una misma estructura por cada registro
function addUser(name,email,avatar){
  if(!avatar){
    avatar = "https://www.gravatar.com/avatar/" + md5( email.trim().toLowerCase() ) + "?s=200&d=retro"
  }else{
    avatar = 'http://'+_CONFIG.listen_ip+":"+_CONFIG.listen_port+"/avatar"+avatar.path
  }

  var new_user = {
    name,
    email,
    avatar,
  }
  _users.push(new_user)
  return new_user
}


// Funcion para verificar si existe un usuario por su email
function userExistsByEmail(email){
  return !!_.find(_users, (o) => { return o.email === email })
}

// Esta funcion servira para verificar si existe el usuario o no
function usersOnly(req,res,next){
  var auth = req.get("Authorization")
  if(!!auth){
    auth = auth.split(" ")
    if(auth.length === 2 && auth[0].toLowerCase() === "bearer"){
      jwt.verify(auth[1], _CONFIG.jwt_hash, function(err, decoded) {
        if(err){
          res.json({success:false,msj:"Hmm ... parece ser que no eres quien dices ser!"})
        }else{
          req.user = decoded
          next()
        }
      });
    }else{
      res.json({success:false,msj:"La cabecera de autenticación no es válida."})
    }
  }else{
    res.json({success:false,msj:"Debes ser un usuario!"})
  }
}


app.use(cors())

app.get('/', (req, res) => {
  res.json({success:true,msjs: _msgs, users: _users})
});



app.post('/msg', usersOnly, (req, res) => {
  let new_msj = addMsg(req.user.email,req.body.type,req.body.content)
  console.log((("["+moment().format("LLL")+"]").bold + " - Mensaje de "+req.user.name).green)
  res.json({success:true,msj: new_msj})
});




app.post('/user', upload.single('avatar'), (req,res) => {
  if( !userExistsByEmail(req.body.email) ){
    let user = addUser(req.body.name,req.body.email,req.file)
    let token = jwt.sign({email: user.email}, _CONFIG.jwt_hash)
    console.log((("["+moment().format("LLL")+"]").bold + " - Nuevo usuario "+user.email).blue)
    res.json({success: true, token})
  }else{
    res.json({success:false, msj: "Ya hay un usuario activo con ese correo"})
  }
})

app.get('/user',usersOnly, (req,res) => {
  console.log(req.user)
  res.send("")
})

app.get('/avatar/:path', (req,res) => {
  let t = __dirname + "/uploads/"+req.params.path
  if(fs.existsSync(t)){
    res.sendFile(t);
  }else{
    res.status(404).send("404");
  }
})


// TODO: eliminar usuario cuando su socket se desconecte y emitir este evento por socket a todos pes

app.listen(_CONFIG.listen_port,_CONFIG.listen_ip, () => {
  console.log();
  console.log('¡Ojo! El api no esta pensada para persistir los mensajes'.bgMagenta.white)
  console.log('estos serán eliminados cuando apagues el servidor!'.bgMagenta.white)
  console.log()
  console.log(('DevChat API corriendo en:'.bold + ' http://'+_CONFIG.listen_ip+":"+_CONFIG.listen_port).white.bgGreen)
  console.log()
  console.log("Desde aquí se registraran todas las interacciones con el api:".dim.underline)
});
