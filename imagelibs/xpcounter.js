///<reference path="/alt1lib.js">
///<reference path="/runeappslib.js">
///<reference path="/imagedetect.js">
///<reference path="/apps/alt1/alt1doc.js">
"use strict";

XpcounterReader.skilliconsize = { w: 27, h: 27 };
XpcounterReader.pinimgArea = { x: -3, y: 10, w: 8, h: 8 };
XpcounterReader.skillnames = ["tot", "att", "str", "ran", "mag", "def", "hpx", "pra", "sum", "dun", "agi", "thi", "sla", "hun", "smi", "cra", "fle", "her", "run", "coo", "con", "fir", "woo", "far", "fis", "min", "div", "inv", "com"];
ImageData.fromBase64(function (comboimg) {
	var imgs = [];
	var pinarea = XpcounterReader.pinimgArea;
	for (var x = 0; x < comboimg.width; x += 27) {
		var i = comboimg.clone(new Rect(x, 0, 27, 27));
		//clear the pinned skill icon area
		for (var xx = 0; xx < pinarea.x + pinarea.w; xx++) {
			for (var yy = pinarea.y; yy < pinarea.y + pinarea.h; yy++) {
				i.setPixel(xx, yy, 0, 0, 0, 0);
			}
		}
		imgs.push(i);
	}
	XpcounterReader.skillimgs = imgs;
}, "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");
//ImageData.fromBase64(i=>XpcounterReader.xpimg = i, "iVBORw0KGgoAAAANSUhEUgAAAAwAAAALCAYAAABLcGxfAAAAWklEQVQoU2P4//8/SRirIAyXTlrwH4ZhYhiK0DEQgIj/QWkFQC4RGtAxnIFsLT4MJmCKVXQNwTQM4/UDumIYhvkBhMF8ZEliMIYAIb9gF4Rajw1jFcSN/zMAABz6d7OPFf6jAAAAAElFTkSuQmCC");




function XpcounterReader() {
	var me = this;
	this.pos = null;
	this.searching = false;
	this.skills = [];
	this.values = [];
	this.rounded = false;

	var callbacks = [];

	/*
	//uses the old method of finding the xpcounters using a depricated alt1 function
	this.findOldmodeAsync = function (cb) {
		var foundcb = function (e) {
			qw(e);
			var index = alt1.events.interfacefound.indexOf(foundcb);
			if (index != -1) { alt1.events.interfacefound.splice(index, 1); }

			if (cb) { cb(); }
		}
		alt1.resetAreaListeners();
		alt1.events.interfacefound.push(foundcb);
		var cbid = alt1.findInterface("xpcounter");
		qw(cbid);
	}*/

	//Starts finding the xpcounter interface from runemetics
	//the cb function is called when completed
	//this will search for 2 or more vertically aligned skill icons that don't have orange text next to them
	this.findAsync = function (cb) {
		var findstep = function (index) {
			var poslist = a1lib.findsubbuffer(buffer, imgs[index]);

			for (var b in poslist) {
				var pos = poslist[b];
				var statlist = false;
				for (var xx = 0; xx < 10; xx++) {
					var p = buffer.getPixel(pos.x + 30 + xx, pos.y + 8);
					if (p[0] == 255 && p[1] == 140 && p[2] == 0) { statlist = true; break; }
					if (p[0] == 255 && p[1] == 203 && p[2] == 5) { statlist = true; break; }
				}

				if (!statlist) {
					matches.push({ skill: index, x: poslist[b].x, y: poslist[b].y });
				}
			}
		}

		var tick = function () {
			findstep(currentindex);
			currentindex++;
			if (currentindex < imgs.length) { setTimeout(tick, 20); }
			else { completed(); }
		}

		var getpos = function () {
			var groups = [];
			for (var a in matches) {
				var found = false;
				for (var b in groups) {
					if (groups[b].x == matches[a].x) {
						found = true;
						groups[b].subs.push(matches[a]);
					}
				}
				if (!found) { groups.push({ x: matches[a].x, subs: [matches[a]] }); }
			}

			var bestsubs = 0;
			var best = null;
			for (var a in groups) { if (groups[a].subs.length > bestsubs) { best = groups[a]; bestsubs = groups[a].subs.length; } }
			if (!best || best.subs.length == 0) { return null; }

			var pos = { x: best.x, y: 0, w: 140, h: 0, rows: best.subs.length };
			pos.y = best.subs.reduce(function (prev, current) { return Math.min(prev, current.y) }, Infinity);
			pos.h = -pos.y + best.subs.reduce(function (prev, current) { return Math.max(prev, current.y + 27); }, 0);
			return pos;
		}

		var completed = function () {
			me.pos = getpos();
			for (var a in callbacks) { callbacks[a](me.pos); }
			callbacks = [];
			me.searching = false;
		}

		if (cb) { callbacks.push(cb); }
		if (me.searching) { return; }
		me.searching = true;
		if (!alt1.rsLinked) {
			completed();
			return;
		}
		var buffer = a1lib.getregion(0, 0, alt1.rsWidth, alt1.rsHeight);
		var matches = [];
		var currentindex = 0;
		var imgs = XpcounterReader.skillimgs;

		setTimeout(tick, 20);
	}

	this.readSkills = function (img) {
		if (!this.pos) { return null; }
		if (!img) { img = a1lib.bindregion(this.pos.x, this.pos.y, this.pos.w, this.pos.h); }
		var buf = img.toData(this.pos.x, this.pos.y, 27, img.height);

		this.skills = [];
		var skillimgs = XpcounterReader.skillimgs;
		var misses = 0;
		for (var i = 0; (i + 1) * 27 <= img.height; i++) {
			var found = false;
			for (var a in skillimgs) {
				if (a1lib.simplecompare(buf, skillimgs[a], 0, i * 27) !== false) {
					this.skills[i] = XpcounterReader.skillnames[a];
					found = true;
					break;
				}
			}
			if (found) { misses = 0; }
			else { misses++; }
			if (misses > 1) { break;}
		}
		this.pos.rows = this.skills.length;
		this.pos.h = this.pos.rows * 27;

		return this.skills;
	}

	this.readValues = function (img) {
		if (!this.pos) { return null;}
		if (!img) { img = a1lib.bindregion(this.pos.x, this.pos.y, this.pos.w, this.pos.h); }

		me.values = [];
		var abbr = false;
		for (var i = 0; i < this.pos.rows; i++) {
			var obj = jsonDecode(alt1.bindReadStringEx(img.handle, 30, i * 27 + 17, jsonEncode({ fontname: "chat", colors: [a1lib.mixcolor(255, 255, 255)] })));
			if (!obj) { me.values[i] = -1; continue; }

			var m=1;
			if (obj.text.match(/M$/)) { m= 1000 * 1000; abbr = true;}
			if (obj.text.match(/[TK]$/)) { m = 1000; abbr = true; }

			var n;//it's just silly to use , as decimal marker in europe you win on this one USA
			if (m == 1) { n = parseInt(obj.text.replace(/[,\.]/g, "")); }
			else { n = parseFloat(obj.text.replace(/[,]/g, ".")); }
			n *= m;

			if (isNaN(n)) { me.values[i] = -1; }
			me.values[i] = n;
		}
		me.rounded = abbr;
	}

	this.read = function (img) {
		if (!this.pos) { return null; }
		if (!img) { img = a1lib.bindregion(this.pos.x, this.pos.y, this.pos.w, (this.pos.rows + 2) * 27); }
		this.readSkills(img);
		this.readValues(img);

		//for (var a = 0; a < this.pos.rows; a++) { qw(this.skills[a], this.values[a]); }
	}

	this.showPosition = function () {
		if (!me.pos) { return;}
		alt1.overLayRect(a1lib.mixcolor(255, 255, 255), me.pos.x, me.pos.y, me.pos.w, me.pos.h, 2000, 2);
	}
}
