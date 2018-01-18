/// <reference path="/runeappslib.js" />
/// <reference path="/alt1lib.js" />
/// <reference path="/imagelibs/xpcounter.js" />

"use strict";

//==== state =====
var hist = {};
var reader = new XpcounterReader();
var measuretime = 0;
var graphtime = 0;
var currenttime = 0;
var trackedxp = 0;
var measurestart = Date.now();
var lastdraw = 0;
var lastchange = 0;

var lastgraphstart = 0;
var lastgraphend = 0;
var lastgraphskill="";

//===== interface state ====
var showbreakdown = false;
var xpdropdownopen = false;
var volumetest = false;
var menubox = null;
var findfails = 0;

//===== tooltip =====
var tooltiptimeout = null;
var tooltiptime = 0;
var tooltipout = false;
var timedragging = false;

//settings
var mode = localStorage.xpmeter_mode == "start" ? "start" : "fixed";// fixed || start
var fixedtime = +localStorage.xpmeter_sampletime || 1000 * 60 * 10;//10min
var repeatalarm = (localStorage.xpmeter_repeatalarm ? localStorage.xpmeter_repeatalarm == "true" : false);
var alertvolume = (localStorage.xpmeter_volume ? +localStorage.xpmeter_volume : 0.5);
var skillid = "";

//==== constants ====
var deletetime = 1000 * 60 * 60 * 4;//remember xp rates for 2hrs
var cnv = null;
var ctx = null;
var intervalsnaps = [1, 2, 5, 10, 20, 30, 45, 60, 120];

function start() {
	resize();
	cnv = elid("cnv");
	ctx = cnv.getContext("2d");

	startFindCounter();
	setInterval(tick, 1000);
	tick();
}

function startFindCounter() {
	if (!reader.searching) { reader.pos = null;}
	reader.findAsync(function () {
		reader.read();
		var found = false;
		for (var a in reader.skills) { if (reader.values[a] > 0) { found = true; } }
		if (!found) { reader.pos = null; }

		if (!reader.pos) { findfails++; if (findfails >= 2) { findcounterError(); } }
		else { findfails = 0; }

		if (reader.pos) { reader.showPosition(); }
		if (reader.rounded) { xpcounterRoundError();}
		tick();
	});
	tick();
}

function tick() {
	if (!reader.pos) {
		if (reader.searching) { elid("xpoutput").innerHTML = "Searching..."; setskillicon(-1); }
		else { elid("xpoutput").innerHTML = "<img src='reload.png'/> Not found"; setskillicon(-1); }
		return;
	}

	currenttime = Date.now();
	fixintervals();
	reader.read();
	if (!skillid && reader.skills[0]) { skillid = reader.skills[0];}
	for (var a in hist) { hist[a].visible = false; }
	for (var a = 0; a < reader.skills.length; a++) {
		if (!reader.skills[a]) { continue; }
		if (reader.values[a] == -1) { continue; }
		skillread(reader.skills[a], reader.values[a], currenttime);
		if (hist[reader.skills[a]]) { hist[reader.skills[a]].visible = true; }
	}

	drawmeter();
	drawgraph();
	fixtooltip();
}

function skillread(skill, xp, time) {
	if (!hist[skill]) {
		hist[skill] = { id: skill, offcount: 0, data: [], visible: true };
	}
	var obj = hist[skill];
	var last = obj.data[obj.data.length - 1];
	if (!last) { last = { xp: 0, time: 0 }; }

	var dxp = xp - last.xp;
	if (dxp == 0) { return; }

	var expected = dxp > 0 && dxp < 125000;//expected change is positive and below 100k
	if (last.xp == 0 || obj.offcount > 10 || expected) {

		//make previous records relative to new counter value (after counter reset or glitch)
		if (!expected && dxp != 0) {
			qw(skill + " reset, d=" + dxp);
			for (var b = 0; b < obj.data.length; b++) { obj.data[b].xp += dxp; }
		}

		obj.data.push({ xp: xp, time: time });
		obj.offcount = 0;
	}
	else {
		obj.offcount++;
	}

	if (skill == skillid && dxp != 0) { lastchange = currenttime; }
}

function drawmeter() {
	var histobj = hist[skillid];
	if (!histobj) {
		elid("xpoutput").innerHTML = "0 xp/hr";
		setskillicon(skillid);
		return;
	}

	var rate = calcmeter(histobj.data, trackedxp != 0 || showbreakdown, currenttime);
	var clusters = rate.clusters;
	var xprate = rate.xprate;

	var str = "";
	for (var a = 0; a < clusters.length; a++) {
		str += "<div class='breakdownrow' style='top:" + (16 * a) + "px'>";
		str += "<div class='breakdownxp'>" + clusters[a].xp.toFixed(1) + " xp</div>";
		str += "<div class='breakdownamount'>" + clusters[a].n + "</div>";
		str += "<div class='breakdownview' onclick='trackxp(" + clusters[a].xp + ");' title='Click to track the amount of times you got this amount of xp'></div>";
		str += "</div>";
	}
	elid("breakdowninner").innerHTML = str;

	if (trackedxp) {
		for (var a = 0; a < clusters.length; a++) {
			if (Math.abs(clusters[a].xp - trackedxp) < trackedxp / 50 + 1) { elid("trackedxp").innerHTML = clusters[a].n + "x " + trackedxp.toFixed(1) + "xp "; break; }
		}
	}

	elid("timer").innerHTML = displaytime(measuretime);
	if (!timedragging) {
		elid("xpoutput").innerHTML = spacednr(xprate) + " xp/hr";
		setskillicon(skillid);
	}

	if (xpdropdownopen) { drawxpselect(); }
	if (menubox) { menubox.drawskills(); }
	lastdraw = currenttime;
}

function drawxpselect() {
	var str = "";
	for (var a in hist) {
		var obj = hist[a];
		if (!obj.visible) { continue; }
		if (obj.id == skillid) { continue; }

		str += "<div class='xpdropdownopt' onclick='setcounter(\"" + obj.id + "\");'>";
		str += "<div class='xpdropdownimg' style='background-position:0px " + (-20 * iconoffset(obj.id)) + "px;'></div>";
		str += "<span>" + spacednr(calcmeter(obj.data, false, currenttime).xprate) + " xp/hr</span>";
		str += "</div>";
	}
	elid("xpdropdown").innerHTML = str;
}

function calcmeter(hist, doclusters, time) {
	var xpgain = 0;
	var clusters = [];
	var measurestart = time - measuretime;
	var deletestart = time - deletetime;
	for (var a = 0; a < hist.length; a++) {
		var last = hist[a == 0 ? 0 : a - 1];
		var pnt = hist[a];
		if (pnt.time < deletestart) { hist.splice(a, 1); a--; continue; }
		if (pnt.time < measurestart) { continue; }

		var dxp = pnt.xp - last.xp;
		xpgain += dxp;

		//clustering xp drops
		if (doclusters && dxp >= 1) {
			var c = false;//found in existing cluster
			for (var b in clusters) {
				if (Math.abs(clusters[b].xp - dxp) < dxp / 50 + 1) {
					clusters[b].n++;
					clusters[b].mass += dxp;
					clusters[b].xp = (clusters[b].xp * (clusters[b].n - 1) + dxp) / clusters[b].n;
					c = true;
					break;
				}
			}
			if (!c) { clusters.push({ n: 1, xp: dxp, mass: dxp }); }
		}
	}
	if (doclusters) {
		clusters.sort(function (a, b) { return a.xp - b.xp; });
		//merge uncommon clusters into their components
		for (a = clusters.length - 1; a >= 0; a--) {//reverse itereration to prevent problem with deleting indexes, also makes it start at the largest xp to allow cascading
			combinecluster(clusters[a].xp, clusters[a], clusters, 0);
		}
		clusters.sort(function (a, b) { return b.n - a.n; });
	}
	var xprate = xpgain * 1000 * 60 * 60 / measuretime;
	return { xpgain: xpgain, xprate: xprate, clusters: clusters };
}

function combinecluster(xp, cl, cls, layer) {
	if (xp < 5) { return false; }
	if (layer > 2) { return false; }

	for (var b = cls.indexOf(cl) ; b >= 0; b--) {
		if (cls[b].n / 7 < cl.n) { continue; }//only allow merging if the merger has more than 7x as much points
		var c = Math.round(xp / cls[b].xp);

		if (Math.abs(c * cls[b].xp - xp) < xp / 50 + 1) {
			cls[b].n += c * cl.n;
			cls[b].mass += c * xp;
			cls.splice(cls.indexOf(cl), 1);
			return true;
		}
	}
}

function fixintervals() {
	if (mode == "fixed") { measuretime = fixedtime; }
	if (mode == "start") { measuretime = currenttime - measurestart; }
	measuretime = Math.min(measuretime, deletetime);
	graphtime = 300;
	while (measuretime / 80 > graphtime) { graphtime *= 2; }
}

function setskillicon(skillid) {
	var newid = (typeof skillid == "string" ? iconoffset(skillid) : skillid);
	if (newid == -1) {
		elid("xpskillicon").style.display = "none";
	}
	else {
		elid("xpskillicon").style.backgroundPosition = "0px " + (-28 * newid) + "px";
		elid("xpskillicon").style.display = "";
	}
}

function displaytime(time) {
	var a, s, m, h;
	time = Math.floor(time / 1000);
	s = time % 60;
	m = Math.floor(time / 60 % 60);
	h = Math.floor(time / 60 / 60 % (60 * 60));

	if (h == 0) { return m + (s % 2 == 0 ? ":" : " ") + addzeros(s, 2); }
	return h + (s % 2 == 0 ? ":" : " ") + addzeros(m, 2) + (s % 2 == 0 ? ":" : " ") + addzeros(s, 2);
}

function iconoffset(skillid) {
	var index = skillnames.indexOf(skillid);
	if (skillid == "com") { index = 31; }
	return index;
}

function clickxp() {
	xpdropdownopen = !xpdropdownopen;

	if (!reader.pos) {
		startFindCounter();
		xpdropdownopen = false;
	}

	toggleclass("xpoutputinner", "active", xpdropdownopen);
	if (xpdropdownopen) { drawxpselect(); }
}

function togglebreak(show) {
	if (show == null) { show = !showbreakdown; }
	showbreakdown = show; 
	toggleclass("cnvcontainer", "showbd", showbreakdown);
	drawmeter();
}

function trackxp(xp) {
	trackedxp = xp;
	toggleclass("trackedxp", "hidden", !xp);
	togglebreak(false);
	drawmeter();
}

function setcounter(id) {
	skillid = id;
	drawmeter();
	drawgraph();
}

function resize() {
	elid("xpoutputinner").style.maxHeight = (window.innerHeight - 14) + "px";
	drawgraph(true);
}

function drawgraph(isResizing) {
	if (!ctx) { return; }
	var startx = floorx(currenttime - measuretime, graphtime);
	var endx = floorx(currenttime - graphtime, graphtime);
	if (!isResizing && startx == lastgraphstart && endx == lastgraphend && skillid == lastgraphskill) { return;}
	if (!hist[skillid]) { return;}

	var w = cnv.offsetWidth;
	var h = cnv.offsetHeight;
	if (h < 20) { cnv.style.visibility = "hidden"; return; }
	else { cnv.style.visibility = "visible"; }
	cnv.width = w;
	cnv.height = h;

	var data = calcGraph(hist[skillid], startx, endx, graphtime);
	var graph = data.graph;

	var min = 0;//bind to 0 for now
	var max = Math.max(data.max, 1);
	ctx.strokeStyle = "#aaa";
	ctx.lineWidth = 3;
	ctx.lineJoin = "round";
	ctx.beginPath();
	for (var a in graph) {
		ctx.lineTo((graph[a].t - startx) / (endx - startx) * w, (h - 2) - (graph[a].v - min) / (max - min) * (h - 4));
	}
	ctx.stroke();

	lastgraphstart = startx;
	lastgraphend = endx;
	lastgraphskill=skillid;
}

function calcGraph(counter, startx, endx, graphstep) {
	var min = Infinity;
	var max = -Infinity;

	var graph = [];
	var last = -1;
	var lastindex = 0;
	for (var a = 0; a < counter.data.length; a++) {
		var pnt = counter.data[a];
		if (pnt.time > startx && last != -1) { break; }
		last = pnt.xp;
		lastindex = a;
	}
	for (var bound = startx; bound <= endx; bound += graphstep) {
		var b = last;
		for (var a = lastindex; a < counter.data.length; a++) {
			var pnt = counter.data[a];
			if (pnt.time <= bound) { continue; }
			if (pnt.time > bound + graphstep) { break; }
			b = pnt.xp;
			lastindex = 0;
		}
		b -= last;
		last = last + b;
		if (b > max) { max = b; }
		if (b < min) { min = b; }
		graph.push({ t: bound, v: b });
	}
	return { graph: graph, min: min, max: max, step: graphstep };
}

function setMode(newmode){
	mode = newmode;
	localStorage.xpmeter_mode = newmode;
	fixintervals();
	drawmeter();
	drawgraph();
}

function clicktimer() {
	setMode(mode == "fixed" ? "start" : "fixed");
}
function doubleclicktimer() {
	measurestart = currenttime - 1;
	mode = "start";
	localStorage.xpmeter_mode = mode;
	fixintervals();
	drawmeter();
	drawgraph();
}

function showMenu() {
	if (menubox) { menubox.frame.closefunc(); menubox = null; return;}

	var skillopts = eldiv({style:"min-height:70px; overflow:hidden;"});
	var pausedraw = false;
	skillopts.onmousedown = function () { pausedraw = true; }
	skillopts.onmouseup = function () { pausedraw = false; }
	var drawskills = function () {
		if (pausedraw) { return;}
		elclear(skillopts);
		for (var a in hist) {
			if (!hist[a].visible) { continue; }
			var last = hist[a].data[hist[a].data.length - 1];
			var inputel = eldiv(":input/radio", { name: "skill" });
			inputel.onchange = function (skill) { setcounter(skill); }.b(a);
			inputel.checked = a == skillid;
			skillopts.appendChild(eldiv("pb2-radio:label",[
				inputel,
				eldiv("skillimg:span", { style: "background-position:0px " + iconoffset(a) * -18 + "px;" }),
				spacednr(last.xp)+" xp"
			]));
		}
	}
	drawskills();

	var resetstarttime = function () {
		measurestart = currenttime - 1;
		fixintervals();
		drawmeter();
		drawgraph();
	}

	var dragwarntime= function (v, bar, title) {
		var time = 1200 + floorx(part * 16800, 600);
		if (time == 18000) { time = 0; }
		title.innerHTML = (time == 0 ? "Never warn" : "Warn: " + time / 1000 + " sec");

		if (!nosend) { a1lib.parentlink.call("eval", "timedraginner(" + part + ");"); }
	}

	var inputfixedtime = function (v) {
		fixedtime = v * 1000 * 60;
		fixintervals();
		drawmeter();
		drawgraph();
		localStorage.xpmeter_sampletime = fixedtime;
	}
	
	var drawalert = function () {
		box.alertenabled.setValue(tooltiptime != 0);
		box.alertsub.setLocked(tooltiptime == 0);
		if(tooltiptime!=0){box.alerttime.setValue(tooltiptime);}
	}

	var alerttimeout = null;
	var changealert = function () {
		if (!box.alertenabled.getValue()) { tooltiptime = 0; }
		else { tooltiptime = box.alerttime.getValue(); }
		timedraginner(tooltiptime);
		fixtooltip();

		timedragging = true;
		if (alerttimeout) { clearTimeout(alerttimeout); }
		alerttimeout = setTimeout(function () { timedragging = false; drawalert(); }, 2000);
	}

	var inputvolume = function (v) {
		setalarmrepeat(true, null);
		elid('alerter').play();
		setvolume(v / 100);
	}

	var buttons = [
		//==== tracking mode =====
		{ t: "header", text: "Tracking mode" },
		{ t: "radio/time", v: "fixed", text: "Fixed sample duration" },
		{ t: "subregion/1:fixedmode", locked: mode != "fixed" },
		{ t: "slider:duration", oninput: inputfixedtime, snaps: intervalsnaps, v: fixedtime / 1000 / 60, text: "Duration: %s min" },
		{ t: "radio/time", v: "start", text: "Fixed starting point" },
		{ t: "subregion/1:startmode", locked: mode != "start" },
		{ t: "button", text: "Reset start point", onclick: resetstarttime },

		//==== input mode ====
		{ t: "header", text: "Input mode" },
		{ t: "button", text: "Search interface", onclick: startFindCounter },
		{ t: "custom", dom: skillopts },

		//==== xp alert ====
		{ t: "header", text: "Afk alert" },
		{ t: "text", text: "This option will warn you when you havn't gained xp in a set amount of time. Consider using the Afk Warden app for more advanced afk warnings." },
		{ t: "bool:alertenabled", text: "Enable xp alert", onchange: changealert },
		{ t: "subregion/3:alertsub" },
		{ t: "slider:alerttime", min: 1200, max: 18000, step: 600, v: tooltiptime || 1200, oninput: changealert, text: v=>"Alert after " + v / 1000 + " sec" },
		{ t: "slider:alertvolume", min: 0, max: 100, v: alertvolume * 100, oninput: inputvolume, onchange: function () { setalarmrepeat(false, null); }, text: "Volume: %s%" },
		{ t: "bool:alertrepeat", v: repeatalarm, onchange: function (v) { setalarmrepeat(null, box.alertrepeat.getValue()); }, text: "Repeat alarm" }
	];

	var box = promptbox2({ title:"Settings",style: "popup",width:300 ,stylesheets:["settingsstyle.css"]}, buttons);
	box.time.setValue(mode);
	box.time.onchange = function (v) {
		box.fixedmode.setLocked(v != "fixed");
		box.startmode.setLocked(v != "start");
		setMode(v);
	}
	box.frame.window.onunload = function () { menubox = null };

	drawalert();

	box.drawskills = drawskills;
	box.drawalerts = drawalert;
	menubox = box;
}

function setvolume(vol) {
	alertvolume = vol;
	var amplitude = vol * vol;// (vol == 0 ? 0 : Math.pow(10, vol) / 10);
	elid("alerter").volume = amplitude;
	localStorage.xpmeter_newvolume = vol;
}

function setalarmrepeat(test, repeat) {
	if (typeof test == "boolean") { volumetest = test; }
	if (typeof repeat == "boolean") { repeatalarm = repeat; localStorage.xpmeter_repeatalarm = "" + repeat; }
	elid("alerter").loop = test || repeat;
}

function fixtooltip() {
	var next = lastchange + tooltiptime;
	if (tooltiptimeout) { clearTimeout(tooltiptimeout); }

	if (tooltiptime == 0) {
		if (tooltipout) {
			alt1.clearTooltip();
			if (!volumetest) { elid("alerter").pause(); elid("alerter").currentTime = 0; }
			tooltipout = false;
		}
	}
	else if (next <= Date.now()) {
		if (!tooltipout) {
			alt1.setTooltip("Check your RS!");
			if (!volumetest) { elid("alerter").play(); }
			tooltipout = true;
		}
	}
	else {
		if (tooltipout) {
			alt1.clearTooltip();
			if (!volumetest) { elid("alerter").pause(); elid("alerter").currentTime = 0; }
			tooltipout = false;
		}
		tooltiptimeout = setTimeout(fixtooltip, next - Date.now() + 50);
	}
}

function timedragstart() {
	newdraghandler(timedrag, function (a) { timedrag(a); timedragend(); });
	timedragging = true;
}

function timedrag(loc) {
	var bounds = elid("timerslidercontainer").getBoundingClientRect();
	var part = (loc.x - bounds.left) / (bounds.right - bounds.left);
	if (part > 1) { part = 1; }
	if (part < 0) { part = 0; }
	var time = 1200 + floorx(part * (18600-1200), 600);
	timedraginner(time);
}

function timedraginner(time) {
	if (time == 0) { time = 18600; }
	elid("timerslider").style.left = ((time - 1200) / (18600 - 1200) * 100) + "%";

	if (time == 18600) { time = 0; }

	tooltiptime = time;
	fixtooltip();
	elid("xpskillicon").style.display = "none";
	elid("xpoutput").innerHTML = (time == 0 ? "Never warn" : "Warn: " + time / 1000 + " sec");
	if (menubox) { menubox.drawalerts(); }
}

function timedragend() {
	timedragging = false;
	elid("xpskillicon").style.display = "";
	drawmeter();
}

function findcounterError() {
	var box = promptbox2({ title: "Xpmeter error", width: 300, style: "popup" }, [
		{ t: "custom", dom: eldiv(":img", { src: absoluteUrl("exampleimg.png"), style: "height:136px; width:107px; float:right; margin:3px;" }) },
		{ t: "text", text: "Alt1 could not find the runemetrics interface on your screen. Make sure you have the xp counter interface open in-game, it should look similair to this image" },
		{ t: "h/11" },
		{ t: "button", text: "More info", onclick: function () { pagepopup('help_afkscape_xpcounter', 350, 500); box.frame.close(); } },
		{ t: "button", text: "Try again", onclick: function () { startFindCounter(); box.frame.close(); } }
	]);
	//TODO merge the afkwarden page with this one?
}

function xpcounterRoundError() {
	if (localStorage.xpmeter_roundwarning=="true") { return;}
	var box = promptbox2({ title: "Xpmeter info", width: 300, style: "popup" }, [
		{ t: "text", text: "Your RuneMetrics interface is set to round xp to K or M. This settings makes xp tracking inaccurate. You can turn this settings off in the RuneMetrics settings under the 'Metrics' tab, there is a toggle to 'show precise values'." },
		{ t: "h/11" },
		{ t: "button", text: "Close", onclick: function () { box.frame.close(); } },
		{ t: "button", text: "Don't show again", onclick: function () { box.frame.close(); localStorage.xpmeter_roundwarning = "true"; } },
	]);

}