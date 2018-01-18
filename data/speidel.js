// https://eloquentjavascript.net/10_modules.html

(function(){
    var speidel;
    var speidel_uri = 'http://'+speidel;
    var bmrz = speidel_uri + "/rz.txt";
    var callTimeout = 100000;

    $(function (){
        $('#upload_status').css('visibility', 'hidden');
        $('#drop_zone').on('dragenter', function(ev){ev.preventDefault();ev.stopPropagation()});
        $('#drop_zone').on('dragover', dragover_handler);
        $('#drop_zone').on('drop', drop_handler);
        // $('#speideladdr').on('change', function () {getrz ($(this).val())});
        $('#speideladdr_form').on('submit', function (ev) {ev.preventDefault();getrz ($('#speideladdr').val())});
        $('#get_recipes_form').on('submit', function (ev) {ev.preventDefault();getrz ($('#speideladdr').val())});
        let speidel_qa = qs('speidel') || $('#speideladdr').val() || readCookie('speidel');
        if (speidel_qa) {
            speidel = speidel_qa;
            $('#speideladdr').val(speidel);
            createCookie('speidel', speidel, 100);
            getrz(speidel);
        }
    });

    function speidel_name() {
        return qs('speidel') || $('#speideladdr').val();
    }
    
    function qs(key) {
        key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, "\\$&"); // escape RegEx meta chars
        var match = location.search.match(new RegExp("[?&]"+key+"=([^&]+)(&|$)"));
        return match && decodeURIComponent(match[1].replace(/\+/g, " "));
    }


    function load_finished (data) {
        console.log ("upload finished:" + data);
    }

    // PL 9X64X64X90X0X0X0X0X0X0X0X0X60X100X60X5X0X0X0X0.American_Wheat
    // JS 9X64X64X90X0X0X0X0X0X0X0X0X100X100X60X5X0X0X0X0.American Wheat
    // 9X64X64X90X100X60X5X0X0X0X0XAmerican Wheat
    // 9X66X60X66X30X80X0X0X0X0X0X0X100X7200X60X2X15X0X0.Amber Christmas
    // 9X64X64X90X0 X0 X0X0X0X0X0X0X60 X100X60X5X0X0X0X0.American_Wheat
    function beerxml2speidel (beerxml) {
        let recipe = beerxml[0];
        let recipe_no = 9;     // FIXME
        let boil_temp = 100;   // FIXME
        let spice_additions = [0,0,0,0,0,0];
        let mash_steps_temps = [0,0,0,0,0];
        let mash_steps_times = [0,0,0,0,0];
        //debugger;
        $('#beerxml').text(recipe.name);
        console.log ("Recipe name" + recipe.name);
        let mashin_temp = recipe.mash.steps[0].temp;
        let recipe_mash_steps = recipe.mash.steps.filter(function(x){ return (x.type == 'Infusion' || x.type == 'Sparge')});
        let recipe_mash_temps = recipe_mash_steps.map(function(x){return x.temp});
        let recipe_mash_times = recipe_mash_steps.map(function(x){return x.time});
        recipe_mash_times = recipe_mash_times.concat(mash_steps_times).slice(0,5);
        recipe_mash_temps = recipe_mash_temps.concat(mash_steps_temps).slice(0,5);

        let recipe_mash_elements = recipe_mash_times.map(function (e,i) { return [e,recipe_mash_temps[i]] });
        let mash_steps_string = recipe_mash_elements.map(function(e) {return [e[1],e[0]].join('X')}).join('X')

        let recipe_spices = recipe.spices.filter(function(x){ return (x.use == 'Boil') });
        let spice_steps_times = recipe_spices.map(function(x){ return x.time });
        
        let spice_steps_unique = spice_steps_times.filter(function(value, index, self) { //array unique
            return self.indexOf(value) === index; 
        }).sort(function(a,b) {return a-b}).reverse();
        let spice_steps_string = spice_steps_unique.concat(spice_additions).slice(0,6).join('X');
        let boil_time=recipe.boilTime || 60;
        let recipe_name = recipe.name.replace(/ /g,'_');
        let recipe_string = [recipe_no,mashin_temp,mash_steps_string,boil_time,boil_temp,spice_steps_string].join('X')+'.'+recipe_name;
        console.log ("Recipe-string: "+recipe_string);
        $('#newrecipe').text(recipe_string);
        return(recipe_string);
    }


    function send_recipe_to_speidel (recipe, index, speidel) {
        
        url = 'http://'+speidel+'/rz.txt';
        console.log("Sending recipe to url: "+url);
        $.ajax({
            url:url,
            data:'rz='+recipe,
            //cache:false,
            crossDomain:true,
            method:'POST',
            async:true,
            timeout:callTimeout,
            beforeSend:function(obj){
	        console.log("Before Post ("+url+"): "+ new Date());
            }
        }).done(function(data){
            console.log("Recipe "+recipe+" uploaded successfully ");
            $('upload_status').text('Upload successful!');
            getrz(speidel);
        }).fail(function(obj,textStat,error){
            $('upload_status').text('Upload FAILED!');
            console.log("Error date: "+ (new Date()));	
            console.log("Error: "+textStat);
            console.log("Error Object: "+error);
            console.log("Object: "+obj);		
        });
    }

    
    function drop_handler(ev) {
        console.log("Drop");
        console.log(ev);
        ev.stopPropagation();
        ev.preventDefault();
        // If dropped items aren't files, reject them
        var dt = ev.originalEvent.dataTransfer;
        //console.log ("Files: "+dt.files)
        //console.log ("Items: "+dt.items)
        if (dt.files) {
            // Use DataTransfer interface to access the file(s)
            for (var i=0; i < dt.files.length; i++) {
                var file = dt.files[i];
                var reader = new FileReader();
                reader.onload = (function(e) {
                    var contents = e.target.result;
                    // console.log ("Got contents:" + contents);
                    $('#beerxml').val(contents);
                    var recipes = Brauhaus.Recipe.fromBeerXml(contents);
                    var recipe_string = beerxml2speidel(recipes);
                    send_recipe_to_speidel (recipe_string, 9, speidel_name());
                    // await sleep(2000);
                    console.log ("recipes: "+recipes);
                });
                reader.readAsText(file);
                console.log("... file[" + i + "].name = " + file.name);
            }  
        } else {
            // Use DataTransferItemList interface to access the file(s)
            for (var i=0; i < dt.items.length; i++) {
                if (dt.items[i].kind == "file") {
                    var file = dt.items[i];
                    var reader = new FileReader();
                    reader.onload = (function(e) {
                        var contents = e.target.result;
                        console.log ("loaded2" + e);
                        console.log ("loaded2" + contents);
                    });
                    reader.readAsText(file);
                    var f = dt.items[i].getAsFile();
                    console.log("VVWASHERE... file[" + i + "].name = " + f.name);
                }
            }
        }
    }

    function dragover_handler(ev) {
        console.log("dragOver");
        // Prevent default select and drag behavior
        ev.preventDefault();
        ev.stopPropagation();
    }


    function getrz (speidel) {
        if (! speidel) {
            speidel = qs('speidel') || $('#speideladdr').val();
        }
        let bmrz = 'http://'+speidel + "/rz.txt";
        console.log ("Getting recipes via url: "+bmrz);
        $.ajax({
            url:bmrz,
            data:"k=0",
            //cache:false,
            crossDomain:true,
            method:'GET',
            async:true,
            timeout:callTimeout,
            beforeSend:function(obj){
	        console.log("Before Send ("+bmrz+"): "+ new Date());
            }
        }).done(function(data){
        $('#upload_status').css("visibility", 'visible');
            var recipesData = data.split("\n").slice(1);
            console.log("Loaded "+recipesData.length.toString()+ "recipes"+(new Date()));
            var recipesArr = recipesData.map(function(x){return x.split('X')});
            for (var i = 0; i < recipesData.length; i++) {
                let recipe = parse_recipe(recipesData[i]);
                console.log ("Found recipe: "+recipe.name);
                $('#recipe_'+(i+1).toString()).html(
                    '<div title="'+recipe.recipeId+'">'+recipe.name+'</div>');
                
                let recipeData = recipesData[0].split('X')
            }
            $('#myspeidel').css("visibility", "visible");
            $('#upload_status').css("visibility", 'hidden');

            $('#recipes').text(data);
            //$('#recipes').text(recipesArr.map(function(x){return x[16]})).join("\n");
            // console.log ("Data:"+recipesData);
        }).fail(function(obj,textStat,error){
            $('#upload_status').text("No speidel found at "+bmrz+". Doublecheck Name/IP!.");
            $('#upload_status').css("visibility", 'visible');
            $('#upload_status').attr("class", 'alert alert-danger');
            
            console.log("No speidel found at "+bmrz);
            console.log("Error: "+textStat);
        });
    }
    // Stolen from bm_controll-min.js
    function parse_recipe(dataString){
	var dataAndNameArray = dataString.split(".");
	
	var dataArray = dataAndNameArray[0].split("X");
	var nameString = dataAndNameArray[(dataAndNameArray.length-1)];
	//if(nameString.trim()===""){
	//    nameString = bmtext[13]+' '+(parseInt(dataArray[0])+1);
	//}
        var recipe = {};
	recipe.recipeId = (parseInt(dataArray[0]));
	recipe.name = nameString;
	recipe.einmaischTemp = parseFloat(dataArray[1]);
	recipe.rast = [
	    { id:1,
	      temp:dataArray[2],
	      time:parseInt(dataArray[3])
	    },
	    {id:2,
	     temp:dataArray[4],
	     time:parseInt(dataArray[5])
	    },
	    {id:3,
	     temp:dataArray[6],
	     time:parseInt(dataArray[7])
	    },
	    {id:4,
	     temp:dataArray[8],
	     time:parseInt(dataArray[9])
	    },
	    {id:5,
	     temp:dataArray[10],
	     time:parseInt(dataArray[11])
	    }
	];
	var igaben = [];
	for(var i=0;i<6;i++){
	    igaben.push(dataArray[(14+i)]);
	    if(dataArray[(14+i)]!=="" && parseInt(dataArray[(14+i)])>0){
		//igaben.push(dataArray[(14+i)]);
	    }
	}
	recipe.hopfengaben = {
	    duration:dataArray[12],
	    temp:parseFloat(dataArray[13]),
	    gaben:igaben
	};
        //console.log("Parsed recipe:", recipe);
        return (recipe);
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    function createCookie(name,value,days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + value + expires + "; path=/";
    }
    
    function readCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }

}())


