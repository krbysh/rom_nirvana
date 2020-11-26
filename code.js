//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

//Load JSON from database

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

var data = {};

// Load JSON text from server hosted file and return JSON parsed object
function loadJSON(filePath) {
	// Load JSON file;
	var json = loadTextFileAjaxSync(filePath, "application/json");
	// Parse JSON
	return JSON.parse(json);
}

// Load text with Ajax synchronously: takes path to file and optional MIME type
function loadTextFileAjaxSync(filePath, mimeType)
{
	var xmlhttp = new XMLHttpRequest();
	//Using synchronous request
	xmlhttp.open("GET", filePath, false);
	if (mimeType != null) {
		if (xmlhttp.overrideMimeType) {
			xmlhttp.overrideMimeType(mimeType);
		}
	}
	try {
		xmlhttp.send();
	}catch(error) {
		console.log("Invalid target address.");
		return null
	}

	if (xmlhttp.status == 200)
	{
		return xmlhttp.responseText;
	}else {
		console.log("Invalid xmlhttp.status.");
		return null;
	}
}

data.person = loadJSON('json/person.json');
data.character = loadJSON('json/character.json');
data.job = loadJSON('json/job.json');

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

//Initialize variables and data structure

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

var debug = true;

data.pt = [[],[],[],[]];


//let data_en = Object.assign({}, data);
//var data_en = $.extend(true, {}, data);

//Sort person array by name
//data.person.sort(function(a,b){
	//console.log(a.name + ", " + b.name + ": " + a.name>b.name);
//	return (a.name.toLowerCase() > b.name.toLowerCase())*2-1;
//})

//Sort character array by name
//data.character.sort(function(a,b){
//	//console.log(a.name + ", " + b.name + ": " + a.name>b.name);
//	return (a.name.toLowerCase() > b.name.toLowerCase())*2-1;
//})

data.personDefaultCharacters = [];
data.personBaseCharacters = [];

//Find character
for(var i = 0; i < data.person.length;i++){
	var defaultCharacter = getDefaultCharacters(i);
	data.personDefaultCharacters.push(defaultCharacter);

	var baseCharacter = getPersonCharacters(i);
	//console.log(baseCharacter);
	data.personBaseCharacters.push(baseCharacter);
}

// Create English index
var dataList = [];
var dataListIdx = {};

for (var i = 0; i < data.person.length; i++) {
	var name = data.person[i].name.toLowerCase();
	dataList.push(name);
	dataListIdx[name] = i;

}

for (var i = 0; i < data.character.length; i++) {
	var name = data.character[i].name.toLowerCase();
	dataList.push(name);
	dataListIdx[name] = i;
}

function initOptions(){
	options = {};
	options.customEnemyList = 0;
	options.customEnemySelected = -1;
	options.customPtEnemySelected = [-1,-1,-1,-1];

	//Holder for enemy options and pre-calculated stats
	enemies = {};
	enemies.cl = {}; //Custom list
	enemies.cl.list = [];

	if(options.customEnemySelected >= enemies.cl.list.length){
		options.customEnemySelected = enemies.cl.list.length - 1;
	}
	for(var i = 0; i < 4;i++){
		if(options.customPtEnemySelected[i] >= data.pt[i].length){
			options.customPtEnemySelected[i] = data.pt[i].length - 1;
		}
	}
}

initOptions();

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

//Put DOM stuff in place

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

$(document).ready(function(){
	//Show incompatibility message: code does not work fr IE<9
	//(Analytics show that the % of people who use IE<9 on my site is EXTREMELY low, like 1 in 30,000)
	if(![].forEach){
		console.log("Unsupported JavaScript");
		$("#update_text").html("Your browser does not appear to support some of the code this app uses (JavaScript ES5). The app probably won't work.");
	}

	//Populate hero select options
	var heroHTML = "<option value=-1 class=\"hero_option\">人選択</option>";
	for(var i = 0; i < data.person.length; i++){
		if(data.person[i].kicked == 0){
			heroHTML += "<option value=" + i + " class=\"hero_option\">" + data.person[i].name + "</option>";
		}
	}

	//Initiate hero lists
	var listHTML = "<option value=-1 class=\"hero_option\">参加者</option>";

	//Inject select2 UI with matcher for hero lists
	$("#challenger_list, #cl_enemy_list").html(listHTML).select2({selectOnClose: true, dropdownAutoWidth : true});

	//Inject select2 UI with matcher for data.person
	$("#challenger_name, #cl_enemy_name").html(heroHTML).select2({selectOnClose: true, dropdownAutoWidth : true});
	//Inject select2 UI
	$("#cl_enemy_character").select2({selectOnClose: true, dropdownAutoWidth : true});
	$("#cl_enemy_job").select2({selectOnClose: true, dropdownAutoWidth : true});

	//Set chart UI
	//TODO: cache this as well

	updateFullUI();

	//Create listener on whole body and check data-var to see which var to replace
	//TODO: make click listeners work similarly
	$("input, select").on("change", function(e){
		var dataVar = $(this).attr("data-var");
		if(dataVar){
			var newVal = $(this).val();
			var useCalcuwait = false;
			var blockCalculate = false;

			if(beginsWith(dataVar,"enemies.cl.list")){
				if(options.customEnemySelected == -1){
					addClEnemy();
				}
				hero = enemies.cl.list[options.customEnemySelected];
			}

			

			var inputType = $(this).attr("type");
			if(inputType == "number"){
				var min = $(this).attr("min");
				var max = $(this).attr("max");
				useCalcuwait = true;
				if(typeof min != "undefined" && typeof max != "undefined"){
					newVal = verifyNumberInput(this,min,max);
				}
				else{
					newVal = parseInt(newVal);
				}
			}
			else if(inputType == "checkbox"){
				newVal = $(this).is(":checked");
			}

			//Change val to numeric if it looks numeric
			//All numbers used by this program are ints
			if($.isNumeric(newVal)){
				newVal = parseInt(newVal);
			}

			changeDataVar(dataVar,newVal);

			//Stuff specific to changing skill
			if(endsWith(dataVar,".character")){
				if(newVal != -1){
					//***This does nothing?***
					var dataToPass = data.character[newVal].name;
					//***This does nothing?***
				}
			}

			//Stuff specific to changing hero
			if(endsWith(dataVar,".index")){
				if(newVal != -1){
					//find hero's starting skills
					initHero(hero);
					updateClList();
				}
			}

			//Update custom enemy when list changes
			if (endsWith(dataVar, ".customEnemySelected")){
				updateEnemyUI();
				//Scroll to middle of list
				$('#cl_enemylist_list').scrollTop((options.customEnemySelected - 6.5) * 25 - 10);
			}

			if (endsWith(dataVar, ".pulse_enemy")){
				updateEnemyUI();
			}
			if(typeof hero != "undefined"){
				updateEnemyUI();
			}
		}

		//Don't check parent elements
		e.stopPropagation();
	});


	//Function Buttons
	$(".button_addpt").click(function(){
		selected = $("#cl_enemy_character").children("option:selected");
		selectedjob = $("#cl_enemy_job").children("option:selected");
		var character = ""
		if(selectedjob.val() != -1){
			character = selected.text() + "(" + selectedjob.text() + ")";
		}else{
			character = selected.text();
		}

		addPt(character,[this.id]);
		updatePtList(this.id)
		//console.log(data.pt);
	})


	//Import/Export Buttons
	$(".button_importexport").click(function(){
		var target = "enemies";
		showImportDialog(target);
	})

	$(".menu_button").click(function() {
	  showOptions($('input[name=menu]:checked').val());
	});

	$("#import_exit").click(function(){
		hideImportDialog();
	})

	$("#reset_challenger").click(function(){
		resetHero(challenger);
	})

	$("#reset_enemies").click(function(){
		resetHero(enemies.fl);
	})

	$("#reset_cl_enemy").click(function(){
		if(enemies.cl.list[options.customEnemySelected]){
			resetHero(enemies.cl.list[options.customEnemySelected]);
		}
	})

	//Show update notice if hasn't been show for this cookie
	doUpdateNotice();
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

//Data manipulating helper functions

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

function initHero(hero, alreadyHasSkills){
	if(hero.index != -1){

		//setSkills(hero);
		setCharacters(hero)
		setCharacterOptions(hero);
		setCharacterJobs();
	}
}

function getDefaultCharacters(personIndex){
	for(var i = 0; i < data.character.length;i++){
		if(data.character[i].character_id==data.person[personIndex].character_id){
			var defaultCharacter = data.character[i].name;
			return defaultCharacter;
			break;
		}
	}
	return ;
}

function getPersonCharacters(personIndex){
	var characterset = [];
	//console.log(data.person[personIndex].name)
	for(var i = 0; i < data.character.length;i++){
		if(data.character[i].person_id==data.person[personIndex].person_id){
			//console.log(data.character[data.character[i].character_id].name)
			var character = [data.character[i].character_id];
			characterset.push(character);
		}
	}
	return characterset;
}

//Adjust merge level for heroes in custom list
function adjustCustomListMerge(){
	enemies.cl.list.forEach(function(hero){
		hero.merge = enemies.cl.merges;
		//Update hero base stats
	});

	//Update enemy UI
	updateEnemyUI();
}

function setCharacters(hero){
	if(typeof hero.index != "undefined" && hero.index != -1){
		hero.character = data.personDefaultCharacters[hero.index];
	}
}

function addClEnemy(index){
	if(!index){
		index = -1;
	}

	var newCustomEnemyId = enemies.cl.list.length;

	enemies.cl.list.push({
		"index":index
	});
	options.customEnemySelected = newCustomEnemyId;
	updateEnemyUI();
	updateClList();

	//Scroll to end of list
	$('#cl_enemylist_list').scrollTop((options.customEnemySelected - 14) * 25 - 10);
}

function selectClEnemy(clEnemyId){
	//this gets called when deleteClEnemy is called because the delete button is inside the select button
	if(clEnemyId < enemies.cl.list.length){
		options.customEnemySelected = clEnemyId;
		updateClList();
		updateEnemyUI();
	}
}

function selectClPtEnemy(clPtEnemyId){
	//this gets called when deleteClEnemy is called because the delete button is inside the select button
	var PtId = String(zeroPadding(clPtEnemyId,2)).slice(0,1);
	var clEnemyId = String(zeroPadding(clPtEnemyId,2)).slice(-1);
	if(clEnemyId < data.pt[PtId].length){
		options.customPtEnemySelected[PtId] = clEnemyId;
		updateClList();
		updatePtList();
		updateEnemyUI();
	}
}

function deleteSelectedClEnemy(){
	enemies.cl.list.splice(options.customEnemySelected, 1);
	if(options.customEnemySelected >= enemies.cl.list.length){
		options.customEnemySelected -= 1;
	}
	updateEnemyUI();
	updateClList();

}

function deleteSelectedClPtEnemy(){
	for(var i = 0; i < 4; i++){
		data.pt[i].splice(options.customPtEnemySelected, 1);
		if(options.customPtEnemySelected[i] >= data.pt[i].length){
			options.customPtEnemySelected[i] -= 1;
		}
	}
	updateEnemyUI();
	updateClList();
	updatePtList();
}

function deleteClEnemy(event,clEnemyId){
	//Don't fuck with renaming ids, just move the text around and hide the highest id
	enemies.cl.list.splice(clEnemyId,1);
	if(options.customEnemySelected >= enemies.cl.list.length){
		options.customEnemySelected -= 1;
	}
	updateEnemyUI();
	updateClList();
	event.stopPropagation();
}

function deleteClPtEnemy(event,clPtEnemyId){
	//Don't fuck with renaming ids, just move the text around and hide the highest id
	var PtId = String(zeroPadding(clPtEnemyId,2)).slice(0,1);
	var clEnemyId = String(zeroPadding(clPtEnemyId,2)).slice(-1);
	data.pt[PtId].splice(clEnemyId,1);
	if(options.customPtEnemySelected[PtId] >= data.pt[PtId].length){
		options.customPtEnemySelected[PtId] -= 1;
	}
	updateEnemyUI();
	updateClList();
	updatePtList();
	event.stopPropagation();
}

function removeAllClEnemies(){
	enemies.cl.list = [];
	options.customEnemySelected = -1;
	options.customPtEnemySelected = [-1,-1,-1,-1];
	updateClList();
	updateEnemyUI();
	data.pt = [[],[],[],[]];
	updatePtList();
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

//UI Functions (mostly)

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////
//TODO: Clean all these mid UI functions up
function changeJobPic(jobIndex){
	var htmlPrefix = "cl_enemy_";
	if(data.skills[hero[slot]]){
		var skillname = data.skills[hero[slot]].name_en;
		skillname = skillname.replace(/\s/g,"_");
		$("#" + htmlPrefix + slot + "_picture").attr("src","skills/" + jobname + ".png");
	}
	else{
		$("#" + htmlPrefix + slot + "_picture").attr("src","job/nojob.png");
	}
}

function setCharacterOptions(hero){
	//set html for character skill select based on valid skills

	var htmlPrefix = "cl_enemy_";
	var charHTML = "<option value=-1>キャラクター選択</option>";
	charHTML += "<option value=0 selected>" + data.character[data.personBaseCharacters[hero.index][0]].name + "</option>";
	for(var i = 1; i < data.personBaseCharacters[hero.index].length; i++){
		charHTML += "<option value=" + i + ">" + data.character[data.personBaseCharacters[hero.index][i]].name + "</option>";
	}
	
	//TODO: Clean this up so slot does not have to be checked again
	//console.log(charHTML);
	$("#" + htmlPrefix + "character").html(charHTML);
}

function setCharacterJobs(){

	var htmlPrefix = "cl_enemy_";
	var jobHTML = "<option value=-1>ジョブ選択</option>";
	for(var i = 0; i < data.job.length; i++){
		jobHTML += "<option value=" + i + "><img class=\"jobIconSmall\" src=\"job/" + data.job[i].name + ".png\"/>"  + data.job[i].name + "</option>";
	}
	
	//console.log(jobHTML);
	$("#" + htmlPrefix + "job").html(jobHTML);
}

function updateEnemyList(){
	var listHTML = "";

	//Add each valid hero into html string
	if (enemies.cl.list.length == 0){
		listHTML = "<option value=-1 class=\"hero_option\">新規プレイヤー</option>";
	}else{
		for(var i = 0; i < enemies.cl.list.length; i++){
			if (enemies.cl.list[i].index < 0){
					listHTML += "<option value=" + i + ">" + "新規プレイヤー" + "</option>";
			}else{
				listHTML += "<option value=" + i + ">" + data.person[enemies.cl.list[i].index].name + "</option>";
			}
		}
	}
	$("#cl_enemy_list").html(listHTML).val(options.customEnemySelected).trigger('change.select2');
}

function updateFullUI(){
	//Refreshes everything about the UI - try to use more specific functions if possible
	updateEnemyUI();
}

function updateEnemyUI(){
	if(options.customEnemyList == 1){
		updateHeroUI(enemies.cl.list[options.customEnemySelected]);
		updateClList();
	}
	$("#cl_enemy_name").trigger('change.select2');
}

function updateHeroUI(hero){
	//Shared elements between challenger and custom enemy

	if(!hero){
		//Make a dummy hero
		hero = {
			"index":-1
		}
	}
	var htmlPrefix = "cl_enemy_";;

	setCharacterOptions(hero);
	$("#" + htmlPrefix + "character").val(hero.character);
	setCharacterJobs();

}

function showImportDialog(side){
	//side = challenger or enemies, type = import or export
	var label = "ゲーム内貼付用テキスト";
	$("#button_import").html("Copy to clipboard").off("click").on("click",function(){copyExportText()});
	$("#export_collapse_label").show().off("click").on("click",function(){$("#importinput").val(getExportText(side))});
	$("#importinput").val(getExportText(side));
	$("#frame_import").removeClass("enemiesimport").addClass("enemiesimport");


	$("#import_title").html(label);
	$("#button_clear").click(function(){
		$("#importinput").val("");
	})

	$("#screen_fade").show();
	$("#frame_import").show();
}

//Import dialog UI is used for export as well
function hideImportDialog(){
	$("#screen_fade").hide();
	$("#frame_import").hide();
}

function addPt(character,id){
	data.pt[id].push(character);
}


//Load custom list from google spreadsheet
//Using API 2.0 that acquires public feed without an API key

function removeEdgeJunk(string){
	return string.replace(/^[\s\._\-]+/, "").replace(/[\s\._\-]+$/, "");
}

//Try to find a string in mainText that's sorta like findText
function includesLike(mainText,findText){
	mainText = mainText.toLowerCase().replace(/[\s\._\-]+/g, "");
	findText = findText.toLowerCase().replace(/[\s\._\-]+/g, "");
	return mainText.indexOf(findText) != -1;
}

function trySplit(string,splits){
	for(var i = 0; i < splits.length; i++){
		var stringSplit = string.split(splits[i]);
		if(stringSplit.length > 1){
			return stringSplit;
		}
	}

	return [string];
}

function getExportText(){
	var delimiter = "  \n";

	var exportText = "";
	for(var i = 0; i < 4; i++){
		if(data.pt[i].length){
			exportText += "PT" + (i + 1) + ":";  
			for(var j = 0; j < data.pt[i].length; j++){
				name= data.pt[i][j];
				var splittedname = String(name).split( /\(|\)/, 2 );
				if(splittedname[1]){
					exportText += String(splittedname[0]).slice(0, 4) + "(" + splittedname[1] + ");";
				} else {
					exportText += String(splittedname[0]).slice(0, 4) + ";";
				}
			}
		}
		exportText += delimiter; 
	}

	if(!exportText){
		//Rude comment if nothing is exported
		exportText = "テキストなし";
	}
	return exportText;
}

function copyExportText(){
	$("#importinput")[0].select();
	var successful = document.execCommand('copy');
	if(!successful){
		$("#button_import").html("Ctrl/Cmd+C でコピーしてください。")
	}

	hideImportDialog();
}


//changedNumber: Whether the number of enemies has changed - must do more intensive updating if this is the case
function updateClList(){
	var lastEnemy = enemies.cl.list.length - 1;
	//Set selected enemy if there are enemies but none is selected
	if(lastEnemy != -1 && options.customEnemySelected == -1){
		options.customEnemySelected = lastEnemy;
	}
	var lastElement = -1;
	var enemyElements = $(".cl_enemy");
	$(".clSelected").removeClass("clSelected");
	//Show/hide existing elements based on number currently in list
	for(var element = 0; element < enemyElements.length; element++){
		var clIndex = parseInt($(enemyElements[element]).attr("data-clindex"));
		if(clIndex > lastElement){
			lastElement = clIndex;
		}
		if(clIndex <= lastEnemy){
			//Update the text of the items in the list
			var enemyIndex = enemies.cl.list[clIndex].index;
			var enemyName = "新規プレイヤー";
			if(enemyIndex >= 0){
				enemyName = data.person[enemyIndex].name;
			}
			//console.log(enemyName);
			$("#cl_enemy" + clIndex + "_name").html(enemyName);
			if(clIndex == options.customEnemySelected){
				$("#cl_enemy" + clIndex).addClass("clSelected");
			}
			$(enemyElements[element]).show();
		}
		else{
			$(enemyElements[element]).hide();
		}
	}

	//Create new elements if needed
	for(var clIndex = lastElement + 1; clIndex <= lastEnemy; clIndex++){
		//Update the text of the items in the list
		var enemyIndex = enemies.cl.list[clIndex].index;
		var enemyName = "新規プレイヤー";
		if(enemyIndex >= 0){
			enemyName = data.person[enemyIndex].name;
		}

		//Need to create a new element - the list is not pre-populated with hidden elements
		var clEnemyHTML = "<div class=\"cl_enemy button\" id=\"cl_enemy" + clIndex
			+ "\" data-clindex=\"" + clIndex
			+ "\" onclick=\"selectClEnemy(" + clIndex
			+ ")\"><span id=\"cl_enemy" + clIndex
			+ "_name\">" + enemyName
			+ "</span><div class=\"cl_delete_enemy button\" id=\"cl_enemy" + clIndex
			+ "_delete\" onclick=\"deleteClEnemy(event," + clIndex
			+ ");\" onmouseover=\"undoClStyle(this)\" onmouseout=\"redoClStyle(this)\">x</div></div>";
		$("#cl_enemylist_list").append(clEnemyHTML);
	}

	//Update select2 List
	updateEnemyList();
}

function updatePtList(ptIndex){
	//Create new elements if needed
	if (arguments.length < 1) {
		for (var j = 0; j < 4; j++){
			ptIndex = j;
//			console.log(data.pt[ptIndex]);
			$("#cl_pt"+ptIndex+"list_list").empty();
			for(var i = 0; i < data.pt[ptIndex].length; i++){
				var enemyName = data.pt[ptIndex][i];
				var clPtHTML = "<div class=\"cl_pt button\" id=\"cl_pt" + ptIndex + i
					+ "\" data-clindex=\"" + ptIndex + i
					+ "\" onclick=\"selectClPtEnemy(" + ptIndex + i
					+ ")\"><span id=\"cl_pt" + ptIndex + i
					+ "_name\">" + enemyName
					+ "</span><div class=\"cl_delete_pt button\" id=\"cl_pt" + ptIndex + i
					+ "_delete\" onclick=\"deleteClPtEnemy(event," + ptIndex + i
					+ ");\" onmouseover=\"undoClStyle(this)\" onmouseout=\"redoClStyle(this)\">x</div></div>";
				$("#cl_pt"+ptIndex+"list_list").append(clPtHTML);
//				console.log(clPtHTML);
			}		
		}
	} else {
		$("#cl_pt"+ptIndex+"list_list").empty();
		for(var i = 0; i < data.pt[ptIndex].length; i++){		
			var enemyName = data.pt[ptIndex][i];	
			var clPtHTML = "<div class=\"cl_pt button\" id=\"cl_pt" + ptIndex + i
				+ "\" data-clindex=\"" + ptIndex + i
				+ "\" onclick=\"selectClPtEnemy(" + ptIndex + i
				+ ")\"><span id=\"cl_pt" + ptIndex + i
				+ "_name\">" + enemyName
				+ "</span><div class=\"cl_delete_pt button\" id=\"cl_pt" + ptIndex + i
				+ "_delete\" onclick=\"deleteClPtEnemy(event," + ptIndex + i
				+ ");\" onmouseover=\"undoClStyle(this)\" onmouseout=\"redoClStyle(this)\">x</div></div>";
			$("#cl_pt"+ptIndex+"list_list").append(clPtHTML);
//			console.log(clPtHTML);
		}
	}
}


function undoClStyle(element){
	$(element).parent().addClass("cl_destyled");
}

function redoClStyle(element){
	$(element).parent().removeClass("cl_destyled");
}

function validateNumberInputs(){
	//For import function
	$("input[type=number]").toArray().forEach(function(element){
		var min = $(element).attr("min");
		var max = $(element).attr("max");
		if(typeof min != "undefined" && typeof max != "undefined"){
			var newVal = verifyNumberInput(element,min,max);
			var dataVar = $(element).attr("data-var");
			changeDataVar(dataVar, newVal);
			$(element).val(newVal);
		}
	});
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

//Purely utility

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////

function capitalize(string){
	if(string.length > 0){
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
	else{
		return string;
	}
}

function replaceRecursive(original,replace){
	for(var key in replace){
		if(typeof original[key] == "object"){
			replaceRecursive(original[key],replace[key]);
		}
		else{
			original[key] = replace[key];
		}
	}
}

function changeDataVar(dataVar,newVal){
	var dataSplit = dataVar.split(".");
	var parsedVar = window;
	for(var level = 0; level < dataSplit.length; level++){
		if(dataSplit[level] == "list"){
			//Replace list with list[i]
			//This won't be the last run
			parsedVar = parsedVar[dataSplit[level]][options.customEnemySelected];
		}
		else{
			if(level == dataSplit.length-1){
				//Last run - set the variable
				parsedVar[dataSplit[level]] = newVal;
			}
			else{
				parsedVar = parsedVar[dataSplit[level]];
			}
		}
		if(typeof parsedVar == "undefined"){
			break;
		}
	}
}

function beginsWith(fullString, substring){
	return (fullString.slice(0, substring.length) == substring);
}

function endsWith(fullString, substring){
	return (fullString.slice(-substring.length) == substring);
}

function getHtmlPrefix(hero){
	var htmlPrefix = "";

	htmlPrefix = "cl_enemy_";

	return htmlPrefix;
}

function getSkillIndexFromId(skillid){
	var index = -1;
	for(var i = 0; i < data.character.length; i++){
		if(data.character[i].skill_id == skillid){
			index = i;
			break;
		}
	}
	//console.log("Looked for index of skill id " + skillid + "; found at " + index);
	return index;
}

function getIndexFromName(name,dataList,slot){
	//Skill/hero array is sorted by name + slot! (only name in case of heroes)
	name = name.toLowerCase();
	slot = slot || "";

	var leftBound = 0;
	var rightBound = dataList.length - 1;
	var checkingIndex;
	var testName;
	var testSlot;
	var testIsS;
	var found = -1;

	do{
		checkingIndex = Math.round((rightBound - leftBound) / 2 + leftBound);
		testName = dataList[checkingIndex].name.toLowerCase();
		testSlot = dataList[checkingIndex].slot || "";

		if(testName + testSlot == name + slot){
			found = checkingIndex;

			break;
		}
		else if(testName + testSlot > name + slot){
			rightBound = checkingIndex - 1;
		}
		else{
			leftBound = checkingIndex + 1;
		}
	}
	while(leftBound <= rightBound);

	return found;
}

function getIndexFromNameEn(name,slot){
	//Skill/hero array is sorted by name + slot! (only name in case of heroes)
	name = name.toLowerCase();
	slot = slot || "";

	var v = name + slot;
	if (v in dataListEnIdx) {
		return dataListEnIdx[v];
	}
	return -1;
}


function verifyNumberInput(element,min,max){
	//contains number between two values and returns it
	newVal = parseInt($(element).val());
	if(!newVal){
		//If input is blank, make it 0
		newVal = 0;
		$(element).val(0);
	}
	if(newVal < min){
		$(element).val(min);
		newVal = min;
	}
	else if(newVal > max){
		$(element).val(max);
		newVal = max;
	}
	return newVal;
}

function removeDiacritics (str) {
	//Copied from
	//https://stackoverflow.com/questions/18123501/replacing-accented-characters-with-plain-ascii-ones
	//ð added to d
	var defaultDiacriticsRemovalMap = [
		{'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
		{'base':'AA','letters':/[\uA732]/g},
		{'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
		{'base':'AO','letters':/[\uA734]/g},
		{'base':'AU','letters':/[\uA736]/g},
		{'base':'AV','letters':/[\uA738\uA73A]/g},
		{'base':'AY','letters':/[\uA73C]/g},
		{'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
		{'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
		{'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
		{'base':'DZ','letters':/[\u01F1\u01C4]/g},
		{'base':'Dz','letters':/[\u01F2\u01C5]/g},
		{'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
		{'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
		{'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
		{'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
		{'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
		{'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
		{'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
		{'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
		{'base':'LJ','letters':/[\u01C7]/g},
		{'base':'Lj','letters':/[\u01C8]/g},
		{'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
		{'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
		{'base':'NJ','letters':/[\u01CA]/g},
		{'base':'Nj','letters':/[\u01CB]/g},
		{'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
		{'base':'OI','letters':/[\u01A2]/g},
		{'base':'OO','letters':/[\uA74E]/g},
		{'base':'OU','letters':/[\u0222]/g},
		{'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
		{'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
		{'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
		{'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
		{'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
		{'base':'TZ','letters':/[\uA728]/g},
		{'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
		{'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
		{'base':'VY','letters':/[\uA760]/g},
		{'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
		{'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
		{'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
		{'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
		{'base':'a','letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
		{'base':'aa','letters':/[\uA733]/g},
		{'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
		{'base':'ao','letters':/[\uA735]/g},
		{'base':'au','letters':/[\uA737]/g},
		{'base':'av','letters':/[\uA739\uA73B]/g},
		{'base':'ay','letters':/[\uA73D]/g},
		{'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
		{'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
		{'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A\u00F0]/g},
		{'base':'dz','letters':/[\u01F3\u01C6]/g},
		{'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
		{'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
		{'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
		{'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
		{'base':'hv','letters':/[\u0195]/g},
		{'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
		{'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
		{'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
		{'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
		{'base':'lj','letters':/[\u01C9]/g},
		{'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
		{'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
		{'base':'nj','letters':/[\u01CC]/g},
		{'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
		{'base':'oi','letters':/[\u01A3]/g},
		{'base':'ou','letters':/[\u0223]/g},
		{'base':'oo','letters':/[\uA74F]/g},
		{'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
		{'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
		{'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
		{'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
		{'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
		{'base':'tz','letters':/[\uA729]/g},
		{'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
		{'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
		{'base':'vy','letters':/[\uA761]/g},
		{'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
		{'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
		{'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
		{'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
	];

	for(var i=0; i<defaultDiacriticsRemovalMap.length; i++) {
		str = str.replace(defaultDiacriticsRemovalMap[i].letters, defaultDiacriticsRemovalMap[i].base);
	}

	return str;
}

function hideUpdateNotice(){
	$("#frame_updatenotice").fadeOut(300);
}

function doUpdateNotice(){
	//If localStorage is not supported, hopefully this just throws an error on this function and doesn't break anything else
	var currentUpdate = parseInt($("#frame_updatenotice").attr("data-update"));
	var lastUpdate = localStorage.getItem("lastUpdateShown") || 0;
	if(lastUpdate<currentUpdate){
		localStorage.setItem("lastUpdateShown",currentUpdate);
		//Don't show the notification until the page is well-loaded
		setTimeout(function(){
			$("#frame_updatenotice").fadeIn(1000);
		}, 1000);
	}
}

function zeroPadding(NUM, LEN){
	return ( Array(LEN).join('0') + NUM ).slice( -LEN );
}