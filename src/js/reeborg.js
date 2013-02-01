/*jshint browser:true, devel:true, indent:4, white:false, plusplus:false */
/*globals $, editor, translate_python */

if (!Array.prototype.remove){
    // Array remove - By John Resig (MIT Licensed) from http://ejohn.org/blog/javascript-array-remove/
    Array.prototype.remove = function(from, to) {
        "use strict";
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };
}
/*
A world can be modified either by a graphical World Builder or
via a JSON string - only the second is currently implemented.
*/

var RUR = RUR || {};

RUR.Error = function (message) {
    this.name = "ReeborgError";
    this.message = message;
};

RUR.World = function () {
    "use strict";
    this.EAST = 0;
    this.NORTH = 1;
    this.WEST = 2;
    this.SOUTH = 3;

    this.set_delay = function (delay) {
        if (delay >= 0  && delay <= 10){
            this.frames.push({delay: Math.round(delay*1000)});
        }
        else {
            alert("delay needs to be specified in seconds, between 0 and 10; this was: " + delay);
        }
    };

    this.pause = function() {
        this.frames.push({pause: true});
    };

    this.reset = function (){
        this.robots = [];
        //this.walls = {};
        // fake wall configuration
        this.walls = {
            "1,3" : ["EAST"],
            "3,3" : ["NORTH"],
            "7,3" : ["EAST"],
            "9,3" : ["NORTH"],
            "5,5" : ["EAST", "NORTH"],
            "4,5" : ["EAST"],
            "5,4" : ["NORTH"]
        };


        this.frames = [];
    };
    this.reset();

    this.add_robot = function (robot) {
        this.robots.push(robot);
        this.add_frame();
    };

    this.is_wall_at = function (coords, orientation) {
        if (RUR.world.walls[coords] !== undefined){
            if (RUR.world.walls[coords].indexOf(orientation) !== -1) {
                return true;
            }
        }
        return false;
    };

    this.move_robot = function(robot){
        var coords;
        robot.prev_x = robot.x;
        robot.prev_y = robot.y;
        switch (robot.orientation){
        case this.EAST:
            coords = robot.x + "," + robot.y;
            if (this.is_wall_at(coords, "EAST")) {
                throw new RUR.Error("Hit wall error");
            }
            robot.x += 1;
            break;
        case this.NORTH:
            coords = robot.x + "," + robot.y;
            if (this.is_wall_at(coords, "NORTH")) {
                throw new RUR.Error("Hit wall error");
            }
            robot.y += 1;
            break;
        case this.WEST:
            if (robot.x===1){
                throw new RUR.Error("Hit wall error");
            } else {
                coords = robot.x-1 + "," + robot.y;
                if (this.is_wall_at(coords, "EAST")) {
                    throw new RUR.Error("Hit wall error");
                }
                robot.x -= 1;
            }
            break;
        case this.SOUTH:
            if (robot.y===1){
                throw new RUR.Error("Hit wall error");
            } else {
                coords = robot.x + "," + robot.y-1;
                if (this.is_wall_at(coords, "NORTH")) {
                    throw new RUR.Error("Hit wall error");
                }
                robot.y -= 1;
            }
            break;
        default:
            throw new Error("Should not happen: unhandled case in RUR.World.move_robot().");
        }
    };

    this.add_error_frame = function (message) {
        this.frames.push({error: message});
    };

    this.add_output_frame = function (element, message) {
        this.frames.push({output: {element:element, message:message}});
    };

    this.add_frame = function () {
        var i, robot, robots = [];
        for (i = 0; i < this.robots.length; i++){
            robot = {};
            robot.x = RUR.world.robots[i].x;
            robot.y = RUR.world.robots[i].y;
            robot.prev_x = RUR.world.robots[i].prev_x;
            robot.prev_y = RUR.world.robots[i].prev_y;
            robot.orientation = RUR.world.robots[i].orientation;
            robot.prev_orientation = RUR.world.robots[i].prev_orientation;
            robot._is_leaky = RUR.world.robots[i]._is_leaky;
            robots.push(robot);
        }
        this.frames.push({robots: robots});
    };

    this.toggle_wall = function (x, y, orientation){
        var index, coords;
        coords = x + "," + y;
        if (this.walls[coords] === undefined){
            this.walls[coords] = [orientation];
        } else {
            index = this.walls[coords].indexOf(orientation);
            if (index === -1) {
                this.walls[coords].push(orientation);
            } else {
                this.walls[coords].remove(index);
                if (this.walls[coords].length === 0){
                    delete this.walls[coords];
                }
            }
        }
    };

    this.export_ = function (){
        var json_object;
        json_object = {"robots": this.robots, "walls": this.walls};
        return JSON.stringify(json_object, null, '   ');
    };

    this.import_ = function (json_string){
        var json_object, orientation, i;
        json_object = JSON.parse(json_string);
        this.robots = [];
        this.walls = json_object.walls;
        for (i = 0; i < json_object.robots.length; i++){
            switch(json_object.robots[i].orientation){
            case 0:
                orientation = "e";
                break;
            case 1:
                orientation = "n";
                break;
            case 2:
                orientation = "w";
                break;
            case 3:
                orientation = "s";
                break;
            }
            this.robots.push(new RUR.PrivateRobot(json_object.robots[i].x, json_object.robots[i].y,
                             orientation, json_object.robots[i].tokens));
        }
    };
};

RUR.world = new RUR.World();

RUR.PrivateRobot = function(x, y, orientation, tokens) {
    "use strict";
    this.x = x || 1;
    this.y = y || 1;
    this.prev_x = this.x;
    this.prev_y = this.y;
    this.tokens = tokens || 0;
    this._is_leaky = true;

    if (orientation === undefined){
        this.orientation = RUR.world.EAST;
    } else {
        switch (orientation.toLowerCase()){
        case "e":
        case "east":
        case "est":
            this.orientation = RUR.world.EAST;
            break;
        case "n":
        case "north":
        case "nord":
            this.orientation = RUR.world.NORTH;
            break;
        case "w":
        case "o":
        case "west":
        case "ouest":
            this.orientation = RUR.world.WEST;
            break;
        case "s":
        case "south":
        case "sud":
            this.orientation = RUR.world.SOUTH;
            break;
        default:
            throw "Should not happen: unknown orientation";
            // TODO: turn this into a warning
        }
    }
    this.prev_orientation = this.orientation;
};

RUR.PrivateRobot.prototype.turn_left = function(){
    "use strict";
    this.prev_orientation = this.orientation;
    this.prev_x = this.x;
    this.prev_y = this.y;
    this.orientation += 1;
    this.orientation %= 4;
    RUR.world.add_frame();
};

RUR.PrivateRobot.prototype.is_leaky = function (leak) {
    this._is_leaky = leak;
};

RUR.PrivateRobot.prototype.a_une_fuite = RUR.PrivateRobot.prototype._is_leaky;

RUR.PrivateRobot.prototype.tourne_à_gauche = RUR.PrivateRobot.prototype.turn_left;

RUR.PrivateRobot.prototype.move = function(){
    "use strict";
    this.prev_orientation = this.orientation;
    RUR.world.move_robot(this);
    RUR.world.add_frame();
};

RUR.PrivateRobot.prototype.avance = RUR.PrivateRobot.prototype.move;

RUR.visible_world = {
    init: function () {
        "use strict";
        this.background_canvas = document.getElementById("background_canvas");
        this.background_ctx = this.background_canvas.getContext("2d");
        this.height = this.background_canvas.height;
        this.width = this.background_canvas.width;
        this.wall_ctx = document.getElementById("wall_canvas").getContext("2d");
        this.trace_ctx = document.getElementById("trace_canvas").getContext("2d");
        this.set_trace_style();
        this.robot_ctx = document.getElementById("robot_canvas").getContext("2d");
        this.rows = Math.floor(this.height / this.wall_length) - 1;
        this.cols = Math.floor(this.width / this.wall_length) - 2;
        this.delay = 50;   // milliseconds
        this.robot_e_img = new Image();
        this.robot_e_img.src = '../src/images/robot_e.png';
        // the following ensures that we won't attempt drawing until the default image is available
        this.robot_e_img.onload = function () {
            RUR.visible_world.reset();
        };
        this.robot_n_img = new Image();
        this.robot_n_img.src = '../src/images/robot_n.png';
        this.robot_w_img = new Image();
        this.robot_w_img.src = '../src/images/robot_w.png';
        this.robot_s_img = new Image();
        this.robot_s_img.src = '../src/images/robot_s.png';
        this.draw();
        this.running = false;
    },
    wall_length: 40,
    wall_thickness: 5,
    robot_y_offset : 6,
    robot_x_offset : 9,
    wall_color: "brown",
    shawdow_wall_color: "#f0f0f0",
    ctx: null,
    draw : function () {
        "use strict";
        this.draw_foreground_walls();
    },
    set_trace_style : function (choice){
        "use strict";
        if (choice === "red") {
            RUR.visible_world.trace_offset = [[25, 25], [25, 25], [25, 25], [25, 25]];
            RUR.visible_world.trace_color = "red";
            RUR.visible_world.trace_thickness = 4;
        } else {
            RUR.visible_world.trace_offset = [[30, 30], [30, 20], [20, 20], [20, 30]];
            RUR.visible_world.trace_color = "seagreen";
            RUR.visible_world.trace_thickness = 1;
        }
    },
    draw_background_walls : function () {
        "use strict";
        var i, j;
        this.ctx = this.background_ctx;
        this.ctx.clearRect(0, 0, RUR.visible_world.width, RUR.visible_world.height);
        this.ctx.fillStyle = this.shawdow_wall_color;
        for (i = 1; i <= this.cols; i++) {
            for (j = 1; j <= this.rows; j++) {
                this.draw_north_wall(i, j);
                this.draw_east_wall(i, j);
            }
        }
    },
    draw_foreground_walls : function () {
        "use strict";
        var key, i, j;
        this.ctx = this.wall_ctx;
        this.ctx.clearRect(0, 0, RUR.visible_world.width, RUR.visible_world.height);
        this.ctx.fillStyle = this.wall_color;
        for (i = 0; i <= this.cols; i++) {
            for (j = 0; j <= this.rows; j++) {
                if (i === 0 && j !== 0) {
                    this.draw_east_wall(i, j);
                } else if (i !== 0 && j === 0) {
                    this.draw_north_wall(i, j);
                } else if (i === 0 && j === 0) {
                    continue;
                } else {
                    key = i + "," + j;
                    if ( key in RUR.world.walls ) {
                        if ( RUR.world.walls[key].indexOf("NORTH") !== -1) {
                            this.draw_north_wall(i, j);
                        }
                        if (RUR.world.walls[key].indexOf("EAST") !== -1) {
                            this.draw_east_wall(i, j);
                        }
                    }
                }
            }
        }
    },
    draw_north_wall : function(i, j) {
        "use strict";
        this.ctx.fillRect(i*this.wall_length, this.height - (j+1)*this.wall_length,
                          this.wall_length + this.wall_thickness, this.wall_thickness);
    },
    draw_east_wall : function(i, j) {
        "use strict";
        this.ctx.fillRect((i+1)*this.wall_length, this.height - (j+1)*this.wall_length,
                          this.wall_thickness, this.wall_length + this.wall_thickness);
    },
    draw_robot : function (robot) {
        "use strict";
        var x, y, img;
        this.ctx = RUR.visible_world.robot_ctx;
        x = robot.x * this.wall_length + this.robot_x_offset;
        y = this.height - (robot.y +1) * this.wall_length + this.robot_y_offset;
        this.ctx.beginPath();
        switch(robot.orientation){
        case RUR.world.EAST:
            img = RUR.visible_world.robot_e_img;
            break;
        case RUR.world.NORTH:
            img = RUR.visible_world.robot_n_img;
            break;
        case RUR.world.WEST:
            img = RUR.visible_world.robot_w_img;
            break;
        case RUR.world.SOUTH:
            img = RUR.visible_world.robot_s_img;
            break;
        default:
            img = RUR.visible_world.robot_e_img;
        }
        this.ctx.drawImage(img, x, y);
        this.draw_trace(robot);
    },
    draw_trace : function (robot) {
        "use strict";
        if (robot._is_leaky === false) {
            return;
        }
        this.ctx = this.trace_ctx;
        this.ctx.strokeStyle = this.trace_color;
        this.ctx.lineWidth = this.trace_thickness;
        this.ctx.lineCap = "round";
        this.ctx.beginPath();
        this.ctx.moveTo(robot.prev_x* this.wall_length + RUR.visible_world.trace_offset[robot.prev_orientation][0],
                        this.height - (robot.prev_y +1) * this.wall_length + RUR.visible_world.trace_offset[robot.prev_orientation][1]);
        this.ctx.lineTo(robot.x* this.wall_length + RUR.visible_world.trace_offset[robot.orientation][0],
                        this.height - (robot.y +1) * this.wall_length + RUR.visible_world.trace_offset[robot.orientation][1]);
        this.ctx.stroke();
    },
    play_frames : function () {
        "use strict";
        if (RUR.visible_world.running){
            RUR.visible_world.running = false;
            return;
        }
        RUR.visible_world.running = true;
        RUR.visible_world.update();
    },
    update : function () {
        "use strict";
        var frame_info;
        if (!RUR.visible_world.running){
            return;
        }
        frame_info = RUR.visible_world.play_single_frame();
        if (RUR.world.frames.length === 0) {
            RUR.controls.stop();
            return;
        }

        if (frame_info === "immediate") {
            clearTimeout(RUR.timer);
            RUR.visible_world.update();
            return;
        } else if (frame_info === "pause") {
            return;
        }

        RUR.timer = setTimeout(RUR.visible_world.update, RUR.visible_world.delay);
    },
    play_single_frame : function () {
        "use strict";
        var frame, robot, ctx;
        ctx = RUR.visible_world.robot_ctx;
        if (RUR.world.frames.length !== 0) {
            frame = RUR.world.frames.shift();
        } else {
            RUR.controls.stop();
            return;
        }
        if (frame.delay !== undefined) {
            RUR.visible_world.delay = frame.delay;
            return "immediate";
        }
        if (frame.pause) {
            RUR.controls.pause();
            return "pause";
        }
        if (frame.error !== undefined) {
            RUR.controls.stop();
            alert(frame.error.name + "\n" + frame.error.message);
            return;
        }
        if (frame.output !== undefined) {
            $(frame.output.element).append(frame.output.message + "\n");
            return;
        }

        ctx.clearRect(0, 0, RUR.visible_world.width, RUR.visible_world.height);
        for (robot=0; robot < frame.robots.length; robot++){
            RUR.visible_world.draw_robot(frame.robots[robot]);
        }
    },
    reset : function () {
        "use strict";
        var dummy;
        RUR.world.reset();
        this.compiled = false;
        this.draw_background_walls();
        this.draw_foreground_walls();
        this.trace_ctx.clearRect(0, 0, RUR.visible_world.width, RUR.visible_world.height);
        dummy = new UsedRobot();
        this.play_single_frame();
        RUR.visible_world.running = false;
    }
};

RUR.compile_javascript = function (src) {
    // Note: by having "use strict;" here, it has the interesting effect of requiring user
    // programs to conform to "strict" usage, meaning that all variables have to be declared,
    // etc.
    "use strict";  // will propagate to user's code, enforcing good programming habits.
    eval(src);
};


RUR.compile_brython = function (src) {
    // do not  "use strict" as we do not control the output produced by Brython
    // translate_python needs to be included in the html page in a Python script
    eval(translate_python(src));
};

RUR.Controls = function (programming_language) {
    "use strict";
    this.programming_language = programming_language;
    this.compile_and_run = function (func) {
        var src, fatal_error_found = false;

        if (!RUR.visible_world.compiled) {
            src = library.getValue() + ";\n";
            src += editor.getValue();
        }
        if (!RUR.visible_world.compiled) {
            try {
                if (this.programming_language === "javascript") {
                    RUR.compile_javascript(src);
                } else if (this.programming_language === "brython") {
                    RUR.compile_brython(src);
                } else {
                    alert("Unrecognized programming language.");
                    fatal_error_found = true;
                }
            } catch (e) {
                if (e.name === "ReeborgError"){
                    RUR.world.add_error_frame(e);
                } else {
                    alert(e.name + "\n" + e.message);
                    fatal_error_found = true;
                    this.stop();
                }
            }
        }

        RUR.visible_world.compiled = true;
        if (!fatal_error_found) {
            func();
        }
    };

    this.run = function () {
        $("#stop").removeAttr("disabled");
        $("#pause").removeAttr("disabled");
        $("#run").attr("disabled", "true");
        $("#step").attr("disabled", "true");
        $("#reload").attr("disabled", "true");
        clearTimeout(RUR.timer);
        RUR.controls.compile_and_run(RUR.visible_world.play_frames);
    };

    this.pause = function () {
        RUR.visible_world.running = false;
        clearTimeout(RUR.timer);
        $("#pause").attr("disabled", "true");
        $("#run").removeAttr("disabled");
        $("#step").removeAttr("disabled");
    };

    this.step = function () {
        RUR.controls.compile_and_run(RUR.visible_world.play_single_frame);
    };

    this.stop = function () {
        clearTimeout(RUR.timer);
        $("#stop").attr("disabled", "true");
        $("#pause").attr("disabled", "true");
        $("#run").attr("disabled", "true");
        $("#step").attr("disabled", "true");
        $("#reload").removeAttr("disabled");
    };

    this.reload = function() {
        RUR.visible_world.reset();
        $("#stop").attr("disabled", "true");
        $("#pause").attr("disabled", "true");
        $("#run").removeAttr("disabled");
        $("#step").removeAttr("disabled");
        $("#reload").attr("disabled", "true");
        $("#output-pre").html("");
    };
};

var output = function (s) {
    RUR.world.add_output_frame("#output-pre", s);
};

var move = function() {
    "use strict";
    RUR.world.robots[0].move();
};
var avance = move;

var turn_left = function() {
    "use strict";
    RUR.world.robots[0].turn_left();
};
var tourne_à_gauche = turn_left;

var set_delay = function(delay) {
    "use strict";
    RUR.world.set_delay(delay);
};
var ajuste_délai = set_delay;

var pause = function () {
    "use strict";
    RUR.world.pause();
};

UsedRobot.prototype = Object.create(RUR.PrivateRobot.prototype);
UsedRobot.prototype.constructor = UsedRobot;

function UsedRobot(x, y, orientation, tokens)  {
    "use strict";
    RUR.PrivateRobot.call(this, x, y, orientation, tokens);
    RUR.world.add_robot(this);
}
var RobotUsagé = UsedRobot;