// https://eloquentjavascript.net/10_modules.html
(function(exports) {
    exports.ajax = function (method, url, data, returndata, failure) {
        // console.log ("Ajax via url: "+url);
        $.ajax({
            url:url,
            data:data,
            //cache:false,
            crossDomain:true,
            method:method,
            async:true,
            timeout: 10000, // 10 sec
            beforeSend:function(obj){
	        // console.log("Before url ("+url+"): "+ new Date());
            }
        }).done(function(data){
            var recipesData = data.split("\n").slice(1);
            console.log("Loaded "+recipesData.length.toString()+ " recipes");
            let recipes = [];
            for (var i = 0; i < recipesData.length; i++) {
                recipes[i] = exports.parse_recipe(recipesData[i]);
                recipes[i].nr = i;
                //console.log ("Found recipe: "+recipes[i].name);
            }
            returndata(recipes);
        }).fail(function(obj,textStat,error){
            failure(obj, error);
            console.log("No speidel found at "+url);
            console.log("Error: "+textStat);
            console.log("Error object: "+error);
        });
        
    }
    exports.getrz = function (speidel, returndata, failure) {
        exports.ajax('GET', 'http://'+speidel+"/rz.txt", '', returndata, failure);
    }
    exports.delrz = function (speidel, id, returndata, failure) {
        exports.ajax('GET', 'http://'+speidel+"/rz.txt?d="+id.toString(), '', returndata, failure);
    }
    exports.sendrz = function (speidel, recipe, id, returndata, failure) {
        console.log ("sending recipe "+recipe+" to "+speidel);
        //export.ajax('POST', speidel+, "/rz.txt", 'rz='+id.toString+'X'+recipe, returndata, failure)
        exports.ajax('POST', 'http://'+speidel+"/rz.txt", 'rz='+recipe, returndata, failure);
    }

    // Stolen from bm_controll-min.js
    exports.parse_recipe = function (dataString){
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

    exports.beerxml2speidel = function (beerxml) {
        let recipe = beerxml[0];
        let recipe_no = 9;     // FIXME
        let boil_temp = 100;   // FIXME
        let spice_additions = [0,0,0,0,0,0];
        let mash_steps_temps = [0,0,0,0,0];
        let mash_steps_times = [0,0,0,0,0];
        //debugger;
        console.log ("Recipe name" + recipe.name);
        let recipe_mash_steps = recipe.mash.steps.
                filter(function(x){ return (x.type == 'Infusion' || x.type == 'Sparge')});
        let recipe_mash_temps = recipe_mash_steps.
                map(function(x){return Math.round(x.temp)});
        let mashin_temp = recipe_mash_temps[0];
        if (! mashin_temp) {
            console.log ("No mash steps, invalid recipe?")
            return null;
        }
        let recipe_mash_times = recipe_mash_steps.map(function(x){return x.time});
        recipe_mash_times = recipe_mash_times.concat(mash_steps_times).slice(0,5);
        recipe_mash_temps = recipe_mash_temps.concat(mash_steps_temps).slice(0,5);

        let recipe_mash_elements = recipe_mash_times.
                map(function (e,i) { return [e,recipe_mash_temps[i]] });
        let mash_steps_string = recipe_mash_elements.
                map(function(e) {return [e[1],e[0]].join('X')}).join('X')

        let recipe_spices = recipe.spices.
                filter(function(x){ return (x.use == 'Boil' || x.use == 'Whirlpool') });
        let spice_steps_times = recipe_spices.
                map(function(x){ return x.time });
        
        let spice_steps_unique = spice_steps_times.
                filter(function(value, index, self) { //array unique
                    return self.indexOf(value) === index; 
                }).sort(function(a,b) {return a-b}).reverse();
        let spice_steps_string = spice_steps_unique.concat(spice_additions).slice(0,6).join('X');
        let boil_time=recipe.boilTime || 60;
        let recipe_name = recipe.name.replace(/ /g,'_');
        let recipe_string =
                [recipe_no,
                 mashin_temp,
                 mash_steps_string,
                 boil_time,
                 boil_temp,
                 spice_steps_string].
                join('X')+'.'+recipe_name;
        console.log ("Recipe-string: "+recipe_string);
        return(recipe_string);
    }
    
        
})(this.speidellib = {});
