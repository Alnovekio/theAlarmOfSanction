var AMongo = require('./amongo.js');
var CMongo = require('./cmongo.js');
var NMongo = require('./nmongo.js');
//const readline = require('readline');

var express = require('express');
var app = express();
var fs = require("fs");
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('./ssl/2_www.ccc425.cn.key', 'utf8');
var certificate = fs.readFileSync('./ssl/1_www.ccc425.cn_bundle.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);

var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/Alarm";
var nId = "";
var wakeUp = 1;
var weather = {};

/*function alarmlist(){
	response = {A:[]};
	var i = 0, p = 0;
	while (true){
		try{fs.statSync('A' + i + '.txt')}catch(err){
			console.log('oops!');
			break;
		}
		console.log(read(i, p));
		i++;
	}
	response.index = i - 1;
	console.log(response);
	return response;
}

		function read(i, p){
			var rl = readline.createInterface({
				input: fs.createReadStream('A' + i + '.txt')
			});
			var l = 0;
			var Alarm = {};
			rl.on('line', function(line){
				switch(l){
					case 0:
						Alarm.hour = line;
						break;
					case 1:
						Alarm.minute = line;
						break;
					case 2:
						Alarm.repeat = line;
						if (line == 0) l+=7;
						break;
					case 3:
						Alarm.weekly = [];
						Alarm.weekly[l-3] = line;
						break;
					case 4:
						Alarm.weekly[l-3] = line;
						break;
					case 5:
						Alarm.weekly[l-3] = line;
						break;
					case 6:
						Alarm.weekly[l-3] = line;
						break;
					case 7:
						Alarm.weekly[l-3] = line;
						break;
					case 8:
						Alarm.weekly[l-3] = line;
						break;
					case 9:
						Alarm.weekly[l-3] = line;
						break;
					case 10:
						Alarm.appoint = line;
						if (line == 0) l+=2;
						break;
					case 11:
						Alarm.month = line;
						break;
					case 12:
						Alarm.date = line;
						break;
					case 13:
						Alarm.note = line;
						break;
				}
				l++;
				console.log(line);
			});
			rl.on('close', ()=>{
				response.A[p] = Alarm;
				p++;
				l = 0;
				return 0;
				console.log(response);
				console.log('readline close...');
			});
		};*/

function alarmList(callback){
	//从MongoDB获取当前闹钟列表
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var dbo = db.db("Alarm");
		var whereStr = {};  // 查询条件
		dbo.collection("Alarm").find(whereStr).toArray(function(err, result) {
			if (err) throw err;
			console.log(result);
			var response = {A: result};
			response.index = result.length;
			db.close();
			callback(response);
		});
	});
}

function alarmSet(req, callback){
	//设置新闹钟，保存到数据库
	/*new AMongo({
		hour: Number(req.body.hour),
		minute: Number(req.body.minute),
		repeat: req.body.repeat,
		weekly: req.body.weekly,
		appoint: req.body.appoint,
		month: req.body.month,
		date: req.body.date,
		note: req.body.note
	}).save().then(function(product){
		console.log(product);
	});*/
	var h = req.body.hour[1] + req.body.hour[2];
	var m = req.body.minute[1] + req.body.minute[2];
	var w = [];
	var I = 0;
	for (var i = 1; i < req.body.weekly.length; i += 2){
		if (req.body.weekly[i] == 1){
			w[I] = 1;
		}
		else w[I] = 0;
		I++;
	}
	new AMongo({
		hour: h,
		minute: m,
		repeat: req.body.repeat,
		weekly: w,
		appoint: req.body.appoint,
		month: req.body.month,
		date: req.body.date,
		note: req.body.note.substr(1, req.body.note.length - 2)
	}).save().then(function(product){
		console.log(product);
		callback(product._id);
	})
}

function alarmDelete(id, callback){
	//从数据库根据返回ID检索闹钟文档并删除
	AMongo.findByIdAndRemove(id, function(err, res){
		if (err) {
			console.log("Error:" + err);
			callback(err);
		}
		else {
			console.log("Res:" + res);
			callback(0);
		}
	});

}

function alarmUpdate(req, callback){
	//从数据库根据返回ID检索闹钟文档并将其修改
	console.log(req);
	var id = req._id;
	delete req._id;
	var w = [];
	var I = 0;
	for (var i = 0; i < req.weekly.length; i += 2){
		if (req.weekly[i] == 1){
			w[I] = 1;
		}
		else w[I] = 0;
		I++;
	}
	req.weekly = w;
	AMongo.findByIdAndUpdate(id, req, function(err, res){
		if (err) {
            console.log("Error:" + err);
			callback(err);
        }
        else {
            console.log("Res:" + res);
			callback(0);
        }
	})
}

function nearest(callback){
	var date = new Date();
	var nextday = new Date();
	nextday.setDate(nextday.getDate() + 1);
	var hour = date.getHours();
	var minute = date.getMinutes();
	var day = date.getDay();
	AMongo.findOneAndUpdate({$and:[{appoint: 1}, {month: nextday.getMonth() + 1}, {date: nextday.getDate()}]}, {appoint: 0}); //检测是否有下一天的预约闹钟，若存在，将其预约保护取消
	var whereStr = {$and: [{"hour": {$gte: hour}}, {$or: [{weekly: 1}, {repeat: 0}]}, {appoint: 0}]};  //查询条件
	AMongo.find(whereStr, '_id weekly repeat hour minute', function(err, result) {
		if (err) throw err;
		for (var i = 0; i < result.length; i++){
			if (result[i].repeat){
				if (result[i].weekly[day] == 0) result.splice(i, 1);
			}
		}
		var nearId = "", nHour = 23, nMin = 60, nmin = 60, ind;
		for (var i = 0; i < result.length; i++){
			if (result[i].hour == hour){
				if (result[i].minute > minute){
					if (result[i].minute < nmin){
						nmin = result[i].minute;
						nearId = String(result[i]._id);
						nHour = -1;
						ind = i;
					}
				}
			}
			else {
				if (result[i].hour <= nHour){
					nHour = result[i].hour;
					if (result[i].minute < nMin){
						nMin = result[i].minute;
						nearId = String(result[i]._id);
						ind = i;
					}
				}
			}
		}
		if (nearId == ""){  //如果在之后的时间里没有查询到有效文档，则后推一日，再次查询
			if (day == 6) day = 0;
			else day++;
			var whereStr = {$and: [{"hour": {$lt: hour}}, {$or: [{weekly: 1}, {repeat: 0}]}, {appoint: 0}]};
			AMongo.find(whereStr, '_id weekly repeat hour minute', function(err, result) {
				if (err) throw err;
				for (var i = 0; i < result.length; i++){
					if (result[i].repeat){
						if (result[i].weekly[day] == 0) result.splice(i, 1);
					}
				}
				var nearId = "", nHour = 23, nMin = 60, nmin = 60, ind;  //重复声明，再次筛选最接近的时间
				for (var i = 0; i < result.length; i++){
					if (result[i].hour <= nHour){
						nHour = result[i].hour;
						if (result[i].minute < nMin){
							nMin = result[i].minute;
							nearId = String(result[i]._id);
							ind = i;
						}
					}
				}
				if (nearId == "") callback(0);
				else if(nearId != nId) {
					nId = nearId;
					let st = JSON.parse(JSON.stringify(result[ind]));
					delete st._id;
					delete st.weekly;
					callback(st);
				}
				else callback(0);
			});
		}
		else if(nearId != nId) {
			nId = nearId;
			let st = JSON.parse(JSON.stringify(result[ind]));
			delete st._id;
			delete st.weekly;
			callback(st);
		}
		else {
			callback(0);
		}
	});
}

function correct(callback){
	var d = new Date();
	var year = String(d.getFullYear() - 2000);
	var month = String(d.getMonth() + 1);
	if (month.length == 1) month = '0' + month;
	var date = String(d.getDate());
	if (date.length == 1) date = '0' + date;
	var hour = String(d.getHours());
	if (hour.length == 1) hour = '0' + hour;
	var minute = String(d.getMinutes());
	if (minute.length == 1) minute = '0' + minute;
	var second = String(d.getSeconds());
	if (second.length == 1) second = '0' + second;
	var day = String(d.getDay());
	if (day == '0') day = '7';
	callback(year + month + date + hour + minute + second + day);
}
	
function costTimeCheck(callback){
	CMongo.findOne({}).exec(function(err,doc){
		if (err) {
            console.log("Error:" + err);
			callback(err);
        }
        else {
            console.log("Document:" + doc);
			callback(doc.time);
        }
	})
}

function costTimeUpdate(req, callback){
	var t = new Array(7);
	console.log(req);
	t = req.split(',');
	for (var i = 0; i < 7; i++){
		t[i] = Number(t[i]);
	}
	CMongo.findOneAndUpdate({}, {time: t}, function(err){
		if (err) {
            console.log("Error:" + err);
			callback(err);
        }
        else {
            callback(0);
        }
	});
}

function weatherRequest(callback){
	var aqi;
	weather = {};
	http.get('http://t.weather.sojson.com/api/weather/city/101010700', function (resp){
		let data = "";
		
		resp.on('data',function(chunk){
			data += chunk;
		});
		
		resp.on('end', function(){
			data = JSON.parse(data);
			console.log(data);
			var date = new Date();
			var DATE = date.getDate();
			var space = data.data.forecast;
			if (DATE == parseInt(space[0].date)) aqi = parseInt(space[0].aqi);
			else aqi = parseInt(space[1].aqi);
		});
	});
	http.get('http://v.juhe.cn/weather/index?format=2&cityname=%e6%98%8c%e5%b9%b3&key=68d22eb7d8353c343e65f17297e5935d', function(resp){
		let data = "";
		
		resp.on('data',function(chunk){
			data += chunk;
		});
		
		resp.on('end', function(){
			data = JSON.parse(data);
			console.log(data);
			//因为很难找到提供优质服务并且免费的天气API，暂时使用这个API接口。存在500次调用次数限制
			//对同学生活影响最大的气象参数除天气、温度、AQI指数、风力外，体感温度对帮助人们决定穿衣方式起到很重要的作用，因此选择了能够计算体感温度的API
			var e = (parseInt(data.result.sk.humidity) / 100) * 6.105 * Math.exp(17.27 * parseInt(data.result.sk.temp) / (237.7 + parseInt(data.result.sk.temp)));//计算水汽压
			var AT = 1.07 * parseInt(data.result.sk.temp) + 0.2 * e - 0.65 * windSpeed(parseInt(data.result.sk.wind_strength)) - 2.7;//计算体感温度的估计值
			weather = {
				UDTime: data.result.sk.time,
				city: data.result.today.city,
				pre_temp: data.result.sk.temp,
				temp: data.result.today.temperature,
				weather: data.result.today.weather,
				weather_id: data.result.today.weather_id.fa,
				hum: data.result.sk.humidity,
				aqi: aqi,
				AT: parseInt(AT),
				wind: data.result.today.wind,
				advice: data.result.today.dressing_advice
			};
			callback(0);
		});
	});
}

function windSpeed(ws){ //将风力转化为该等级风速的平均值
	switch (ws){
		case 0:
			return 0.1;
			break;
		case 1:
			return 0.9;
			break;
		case 2:
			return 2.45;
			break;
		case 3:
			return 4.4;
			break;
		case 4:
			return 6.7;
			break;
		case 5:
			return 9.35;
			break;
		case 6:
			return 12.3;
			break;
		case 7:
			return 15.5;
			break;
		case 8:
			return 18.95;
			break;
		case 9:
			return 22.6;
			break;
		case 10:
			return 26.45;
			break;
		case 11:
			return 30.55;
			break;
		default:
			return "千万别出门";
			break;
	}
}

function noteList(callback){
	var noteMessage = {};
	NMongo.find({finished: 0}, "note id", function(err, doc){
		if (err) {
            console.log("Error:" + err);
			callback(err);
        }
        else {
            noteMessage.unfinished = doc;
			NMongo.find({finished: 1}, "note id", function(err, doc){
				if (err) {
					console.log("Error:" + err);
					callback(err);
				}
				else {
					noteMessage.finished = doc;
					callback(noteMessage);
				}
			});
        }
	});
}

function newItem(req, callback){
	new NMongo({
		note: req.note,
		id: req.id,
		finished: 0
	}).save();
	callback(0);
}

function finish(req, callback){
	NMongo.findOneAndUpdate({id: req}, {finished: 1}, function(err, doc){
		if (err) {
			console.log("Error:" + err);
			callback(err);
		}
		else {
			callback(0);
		}
	});
}

function noteRemove(req, callback){
	NMongo.findOneAndRemove({id: req}, function(err, doc){
		if (err) {
			console.log("Error:" + err);
			callback(err);
		}
		else {
			callback(0);
		}
	});
}

	//这里是函数区域


app.get('/query', function(req, res){
	//微信小程序查询当前的闹钟设置列表
	alarmList(function(data){
		res.send(data);
		console.log("SendToClient: %s", data);
    });
});

app.post('/NewAlarm', urlencodedParser, function(req, res){
	console.log("A new request of setup a new alarm.")
	//微信小程序创建一个新的闹钟
	alarmSet(req, function(id){
		res.send(id);
		console.log("New Success");
	});
});

app.post('/AlarmUpdate', urlencodedParser, function(req, res){
	//微信小程序更改一个现存闹钟
	alarmUpdate(req.body, function(isErr){
		if (isErr == 0) {
			res.send("Update success!");
			console.log("Update success!");
		}
		else {
			res.send("Unexpected error" + isErr);
			console.log("Unexpected error: %s", isErr);
		}
	});
});

app.post('/delete', urlencodedParser, function(req, res){
	//微信小程序删除一个现存闹钟
	console.log(req.body);
	alarmDelete(req.body._id, function(isErr){
		if (isErr == 0){
			res.send("Delete success!");
			console.log("Delete success!");
		}
		else{
			res.send("Unexpected error: that document has already disappeared.");
			console.log("Delete Error");
		}
	});
	
});

app.get('/NearestAlarm', function(req, res){
	//设备查询最近的闹钟时间
	nearest(function(isChanged) {
		if (isChanged != 0){
			res.send(isChanged.hour + isChanged.minute);
			console.log("ToDevice: %s %s", isChanged.hour, isChanged.minute);
		}
		else res.send("GH");
	});
});

app.get('/TimeCorrect', function(req,res){
	correct(function (t) {
		console.log("Time Corrected");
		res.send(t);
	});
});

app.get('/CostTimeR', function(req, res){
	costTimeCheck(function(t){
		res.send(t);
	});
});

app.post('/CostTimeW', urlencodedParser, function(req, res){
	console.log(req.body);
	costTimeUpdate(req.body.time, function(t){
		res.json(weather);
		wakeUp = 0;
	});
});

app.get('/WakeUp', function(req, res){
	if (req.query == 0) {
		res.send("0");
		wakeUp = 0;
	}
	else if (req.query == 1) {
		res.end();
		wakeUp = 1;
		console.log("It's time to get up.")
	}
	else if (wakeUp == 1) {
		res.send("1");
	}
	else res.send("0");
});

app.get('/NoteList', function(req, res){
	noteList(function(t){
		console.log(JSON.parse(JSON.stringify(t)));
		res.send(t);
	});
});

app.post('/NewItem', urlencodedParser, function(req, res){
	newItem(req.body, function(err){
		if (!err) res.end();
		else res.send("Error!");
	});
});

app.post('/Finish', urlencodedParser, function(req, res){
	console.log(req.body);
	finish(req.body.id, function(err){
		if (!err) res.end();
		else res.send("Error!")
	});
});

app.post('/NoteRemove', urlencodedParser, function(req, res){
	console.log(req.body)
	noteRemove(req.body.id, function(err){
		if (!err) res.end();
		else res.send("Error!")
	});
});

app.get('/WeatherForecast', function(req, res){
	weatherRequest(function(){
		console.log(weather);
		res.send(weather);
	});
});

var server = app.listen(8081, function(){
    var port = server.address().port;
    console.log("HTTPS Server is running on：http://localhost:%s", port);
	httpsServer.listen(443, function() {
		var port = httpsServer.address().port;
		console.log('HTTPS Server is running on: https://localhost:%s', port);
		console.log("Good Morning...");
	});
});
