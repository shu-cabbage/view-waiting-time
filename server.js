const express = require("express");
const app = express();
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const server = http.Server(app);
const PORT = process.env.PORT || 3000;
const socketio = require("socket.io");
const io = socketio(server);

const data_file_path = "./src/foods/json";
const store_directory_path = "./src/management/store/";

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/src/index.html");
});

app.use(express.static(__dirname + "/src"));

server.listen(PORT, () => {
    console.log("server on port %d", PORT);
});

io.on("connection", (socket) => {
    console.log("connection: ", socket.id);
    socket.on("send_food_data", (data) => {
        let send_data = {food: data.foodName, time: data.time * data.person};
        socket.broadcast.emit("waiting_time", send_data);
        sort_foods(data);
    });
    socket.on("send_new_store_data", (data) => {
        console.log(data);
        let json_data = JSON.parse(fs.readFileSync(data_file_path, "utf-8"));
        let length = 16;
        let file_hash = crypto.randomBytes(length).toString("hex");
        let file_hash_status = true;
        if(json_data.foods.length != 0){
            do{
                let val = 0;
                for(let i = 0; i < json_data.foods.length; i++){
                    if(json_data.foods[i].url.split("/")[3].split(".")[0] == file_hash){
                        file_hash = crypto.randomBytes(length).toString("hex");
                        break;
                    }else{
                        val++;
                    }
                    if(val == json_data.foods.length){
                        file_hash_status = false;
                    }
                }
            }while(file_hash_status)
        }
        data.newStoreData.url = "./../store/" + file_hash + ".html";
        console.log(file_hash);
        
        let masterData = [];
        for(let i = 0; i < json_data.foods.length; i++){
            masterData.push({
                food : json_data.foods[i].food,
                time : json_data.foods[i].time,
                person : json_data.foods[i].person,
                total : json_data.foods[i].total,
                url : json_data.foods[i].url,
                sell_status : json_data.foods[i].sell_status,
            });
        }
        masterData.push(data.newStoreData);
        let newMainNData = JSON.stringify({foods: masterData}, null, "    ");
        console.log(newMainNData);
        fs.writeFileSync(data_file_path, newMainNData);
        create_new_form(data.newStoreData.food, file_hash);
        socket.broadcast.emit("add_after_reload", "");
        socket.emit("add_after_reload", "");
    });
    socket.on("edit_delete_func", (data) => {
        edit_foods(data);
        socket.emit("add_after_reload", {old_name:data.store_name, new_name:data.new_store_name});
        socket.broadcast.emit("add_after_reload", {old_name:data.store_name, new_name:data.new_store_name});
    });
    socket.on("outOfSold", (data) => {
        outOfSold_food(data);
        socket.emit("reload", "");
        socket.broadcast.emit("reload", "");
    });
});

function outOfSold_food(data){
    let masterData = [];
    let json_data = JSON.parse(fs.readFileSync(data_file_path, "utf-8"));
    for(let i = 0; i < json_data.foods.length; i++){
        if(json_data.foods[i].food == data){
            masterData.push({
                food : json_data.foods[i].food,
                time : json_data.foods[i].time,
                person : json_data.foods[i].person,
                total : json_data.foods[i].total,
                url : json_data.foods[i].url,
                sell_status : "soldout",
            });
        }else{
            masterData.push({
                food : json_data.foods[i].food,
                time : json_data.foods[i].time,
                person : json_data.foods[i].person,
                total : json_data.foods[i].total,
                url : json_data.foods[i].url,
                sell_status : json_data.foods[i].sell_status,
            });
        }
    }
    let newMainNData = JSON.stringify({foods : masterData}, null, "    ");
    fs.writeFileSync(data_file_path, newMainNData);
}

function edit_foods(data){
    let json_data = JSON.parse(fs.readFileSync(data_file_path, "utf-8"));
    let masterData = [];
    let delete_arr_num;
    for(let i = 0; i < json_data.foods.length; i++){
        if(data.store_name == json_data.foods[i].food){
            if(data.edit_status == "edit"){
                masterData.push({
                    food : data.new_store_name,
                    time : json_data.foods[i].time,
                    person : json_data.foods[i].person,
                    total : json_data.foods[i].total,
                    url : json_data.foods[i].url,
                    sell_status : json_data.foods[i].sell_status,
                });
                create_new_form(data.new_store_name, json_data.foods[i].url.split("/")[3].split(".")[0]);
            }else{
                delete_arr_num = i;
                masterData.push({
                    food : json_data.foods[i].food,
                    time : json_data.foods[i].time,
                    person : json_data.foods[i].person,
                    total : json_data.foods[i].total,
                    url : json_data.foods[i].url,
                    sell_status : json_data.foods[i].sell_status,
                });
            }
        }else{
            masterData.push({
                food : json_data.foods[i].food,
                time : json_data.foods[i].time,
                person : json_data.foods[i].person,
                total : json_data.foods[i].total,
                url : json_data.foods[i].url,
                sell_status : json_data.foods[i].sell_status,
            });
        }
    }
    if(data.edit_status == "delete"){
        fs.unlink(store_directory_path + masterData[delete_arr_num].url.split("/")[3], (err) => {
            if (err) throw err;
            console.log('deleted file');
        });
        masterData.splice(delete_arr_num, 1);
    }
    let newMainNData = JSON.stringify({foods : masterData}, null, "    ");
    fs.writeFileSync(data_file_path, newMainNData);
}

function sort_foods(food_data){
    let masterData = [];
    let json_data = JSON.parse(fs.readFileSync(data_file_path, "utf-8"));
    for(let i = 0; i < json_data.foods.length; i++){
        if(json_data.foods[i].food == food_data.foodName){
            masterData.push({
                food : food_data.foodName,
                time : food_data.time,
                person : food_data.person,
                total : food_data.total,
                url : food_data.url,
                sell_status : json_data.foods[i].sell_status,
            });
        }else{
            masterData.push({
                food : json_data.foods[i].food,
                time : json_data.foods[i].time,
                person : json_data.foods[i].person,
                total : json_data.foods[i].total,
                url : json_data.foods[i].url,
                sell_status : json_data.foods[i].sell_status,
            });
        }
        
    }
    let newMainNData = JSON.stringify({foods : masterData}, null, "    ");
    fs.writeFileSync(data_file_path, newMainNData);
}

function create_new_form(newName, file_name){
    let data = `<!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8">
            <title></title>
            <script src="/socket.io/socket.io.js"></script>
        </head>
        <body>
            <h1>${newName}</h1>
            <div style="display: flex;">
                <p>一人当たりの待ち時間</p><p class="waiting_time_PP_foodName">0</p><p>分</p>
                <button id="increase_waiting_time">+5分</button>
                <button id="decrease_waiting_time">-5分</button>
            </div>
            <div style="display: flex;">
                <p>待ち人数</p><p class="foodName_peopel">0</p><p>人</p>
                <button id="increase_people">+1人</button>
                <button id="decrease_people">-1人</button>
            </div>
    
            <button onclick="javascript:document.querySelector('dialog').showModal();">売り切れ</button>
            <dialog>
                <div id="dialog_div">
                    <p>ステータスを売り切れに変更します</p>
                    <p>この操作は取り消せません</p>
                    <button onclick="javascript:document.querySelector('dialog').close();">キャンセル</button>
                    <button onclick="outOfSold_run()">実行</button>
                </div>
            </dialog>
        </body>
        <script>
            const socket = io();
            let foodName;
            let food_num_of_people = 0;
            let total_person = 0;
            let food_waiting_time_PP = 0;
            let url;
            let sell_status;

            document.querySelector("dialog").addEventListener("click", function(event){
                if(event.target.closest("#dialog_div") === null){
                    document.querySelector("dialog").close();
                };
            });

            socket.on("add_after_reload", function(data){
                if(foodName == data.old_name){
                    foodName = data.new_name;
                    document.querySelector("h1").textContent = document.title = foodName;
                    document.querySelectorAll(".waiting_time_PP_foodName")[0].setAttribute("id", "waiting_time_PP_" + foodName);
                    document.querySelectorAll(".foodName_peopel")[0].setAttribute("id", foodName + "_people");
                }
            });
    
            function outOfSold_run(){
                socket.emit("outOfSold", foodName);
                document.querySelector("dialog").close();
                document.querySelectorAll("button").forEach(data => {
                    data.disabled = "disable";
                });
                document.getElementById("waiting_time_PP_" + foodName).textContent = "null";
                document.getElementById(foodName + "_people").textContent = "null";
            }
    
            async function doAjaxThings(){
                foodName = document.querySelector("h1").textContent;
                document.title = foodName;
                document.querySelectorAll(".waiting_time_PP_foodName")[0].setAttribute("id", "waiting_time_PP_" + foodName);
                document.querySelectorAll(".foodName_peopel")[0].setAttribute("id", foodName + "_people");
                let result = await makeRequest("GET", "./../../foods.json");
                for(let i = 0; i < result.foods.length; i++){
                    if(result.foods[i].food == foodName){
                        food_num_of_people = result.foods[i].person;
                        food_waiting_time_PP = result.foods[i].time;
                        total_person = result.foods[i].total;
                        url = result.foods[i].url;
                        sell_status = result.foods[i].sell_status
                    }
                }
                document.getElementById("increase_waiting_time").setAttribute("onclick", "increase_waiting_time()");
                document.getElementById("decrease_waiting_time").setAttribute("onclick", "decrease_waiting_time()");
                document.getElementById("increase_people").setAttribute("onclick", "increase_people()");
                document.getElementById("decrease_people").setAttribute("onclick", "decrease_people()");
                if(sell_status == "soldout"){
                    document.getElementById("waiting_time_PP_" + foodName).textContent = "null";
                    document.getElementById(foodName + "_people").textContent = "null";
                }else{
                    document.getElementById("waiting_time_PP_" + foodName).textContent = food_waiting_time_PP;
                    document.getElementById(foodName + "_people").textContent = food_num_of_people;
                }
                if(sell_status == "soldout"){
                    document.querySelectorAll("button").forEach(data => {
                        data.disabled = "disable";
                    });
                }
            }
    
            function makeRequest(method, url){
                return new Promise(function (resolve, reject){
                    let xhr = new XMLHttpRequest();
                    xhr.open(method, url);
                    xhr.onload = function (){
                        if(this.status >= 200 && this.status < 300){
                            resolve(JSON.parse(xhr.response));
                        }else{
                            reject({
                                status: this.status,
                                statusText: xhr.statusText
                            });
                        }
                    }
                    xhr.onerror = function(){
                        reject({
                            status: this.status,
                            statusText: this.statusText
                        });
                    }
                    xhr.send();
                });
            }
    
            document.addEventListener("DOMContentLoaded", function(){
                doAjaxThings();
            });
    
            function increase_waiting_time(){
                const waiting_time_PP = document.getElementById("waiting_time_PP_" + foodName);
                food_waiting_time_PP = food_waiting_time_PP + 5;
                waiting_time_PP.textContent = food_waiting_time_PP;
                if(food_num_of_people !== 0){
                    socket.emit("send_food_data", {foodName: foodName, time: food_waiting_time_PP, person: food_num_of_people, total: total_person, url:url});
                }
            }
    
            function decrease_waiting_time(){
                if(food_waiting_time_PP !== 0){
                    const waiting_time_PP = document.getElementById("waiting_time_PP_" + foodName);
                    food_waiting_time_PP = food_waiting_time_PP - 5;
                    waiting_time_PP.textContent = food_waiting_time_PP;
                    if(food_num_of_people !== 0){
                        socket.emit("send_food_data", {foodName: foodName, time: food_waiting_time_PP, person: food_num_of_people, total: total_person, url:url});
                    }
                }
            }
    
            function increase_people(){
                total_person++;
                const waiting_people = document.getElementById(foodName + "_people");
                food_num_of_people++;
                waiting_people.textContent = food_num_of_people;
                socket.emit("send_food_data", {foodName: foodName, time: food_waiting_time_PP, person: food_num_of_people, total: total_person, url:url});
            }
    
            function decrease_people(){
                if(food_num_of_people !== 0){
                    const waiting_people = document.getElementById(foodName + "_people");
                    food_num_of_people--;
                    waiting_people.textContent = food_num_of_people;
                    socket.emit("send_food_data", {foodName: foodName, time: food_waiting_time_PP, person: food_num_of_people, total: total_person, url:url});
                }
            }
        </script>
    </html>`;
    fs.writeFileSync(store_directory_path + file_name + ".html", data);
}