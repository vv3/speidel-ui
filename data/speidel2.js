var app = new Vue({
    el: '#speidel_app',
    data: {
        speidel: '',
        recipes: [],
        speidelvisible: 'hidden',
        bfrecipe: null,
        bfrecipes: null,
        api_key: null,
        api_email: null,
        loading_bf_recipes: true,
        loading_speidel: false,
        recipe_name: 'Nameless',
        mash_times: [30,30,10,0,0],
        mash_temps: [50,66,76,0,0],
        hop_times: [60,15,5,0,0,0],
        boil_time: 60,
        show_manual_form: false,
        include_snapshots: true,
    },

    watch: {
        recipe_candidates: function () {
            this.populateRecipesfield();
        }
    },
    // FIXME, doesn't work
    computed: {
        recipe_candidates: function () {
            if (! this.bfrecipes || this.bfrecipes.length == 0) {
                return [];
            }
            if (this.include_snapshots) {
                return this.bfrecipes.recipes;
            } else {
                 return this.bfrecipes.recipes.
                    filter(function(x) {return x.recipe.snapshot == 0 });
            }
        },
        num_bfrecipes: function () {
            if ('recipes' in this.bfrecipes) {
                return this.recipe_candidates.length;
            } else {
                return 0;
            }
        },
        recipe_string: function (){
            let recipe_mash_elements = this.mash_times.map(function (e,i) { return [e,app.$data.mash_temps[i]] });
            let mash_steps_string = recipe_mash_elements.map(function(e) {return [e[1],e[0]].join('X')}).join('X');

            let spice_steps_string = this.hop_times.join('X');
            let recipe_name = this.recipe_name.replace(/ /g,'_');
            return (
                [9,
                 Math.round(this.mash_temps[0]),
                 mash_steps_string,
                 Math.round(this.boil_time),
                 Math.round(100), // FIXME
                 spice_steps_string].
                    join('X')+'.'+recipe_name
            );
        }
    },
    created(){
        if (typeof api_data !== 'undefined') {
            this.api_key   = api_data.local_api_key;
            this.api_email = api_data.local_api_email;
            this.api_url   = api_data.local_api_url;
            this.speidel = this.query_args('speidel');
        }
        if (this.speidel) {
            this.loadRecipes();
        }
        this.refreshBFRecipes();
    },
    mounted(){
    },
    methods: {
        refreshBFRecipes: function (data) {
            if (this.api_key) {
                this.loading_bf_recipes = true;
                this.bfrecipes = [];
                brewersfriend.getrecipes (
                    this.api_url,
                    this.api_key,
                    this.api_email,
                    this.gotBFRecipes,
                    this.nofunc
                );
            }
        },
        populateRecipesfield: function () {
            $("#bfname").autocomplete({
                source: this.recipe_candidates.
                    map(function(x) {return {label: x.recipe.title+' ('+x.recipe.updated_at.substring(0,10)+')', value: x}}),
                select: function( event, ui ) {
                    $("#bfname").val(ui.item.value.recipe.title); 
                    app.$data.bfrecipe = ui.item.value; // FIXME
                    $("#bf_upload_button").html("<span>Upload <em>"+ui.item.value.recipe.title+"</em> to Speidel");
                    $("#bf_upload_button").css({ 'visibility': "visible" });
                    
                    return false;
                },
                focus: function( event, ui ) {
                    $("#bfname").val(ui.item.value.recipe.title);
                    return false;
                }
            });
        },
        
        gotBFRecipes: function (data) {
            this.loading_bf_recipes = false;
            this.bfrecipes = data;
            // app.$data.num_bfrecipes = this.bfrecipes.recipes.length
            if ('recipes' in this.bfrecipes) {
                this.populateRecipesfield();
            }
        },

        uploadFormRecipe: function (data) {
            console.log("Uploading form recipe: "+this.recipe_string);
            speidellib.sendrz
            (
                this.speidel,
                this.recipe_string,
                9,
                this.populateRecipesdata,
                this.speidelNotfound,
            );

            //9X50X50X30X66X30X76X10X0X0X0X0X60X100X60X15X5X0X0.HveteIPA
            //9X50X50X30X66X30X76X10X0X0X0X0X60X100X60X15X5X0X0X0.HveteIPA
            //9X50X50X30X66X30X76X10X0X0X0X0X60X100X60X15X5X0X0X0

        },
        uploadBFRecipe: function (data) {
            let spice_additions = [0,0,0,0,0,0];
            let mash_steps_temps = [0,0,0,0,0];
            let mash_steps_times = [0,0,0,0,0];
            let recipe_no = 9; // FIXME
            let boil_temp = 100;
            // console.log("Uploadbfrecipe: "+this.bfrecipe);
            let recipe = app.$data.bfrecipe;
            if (recipe && ! recipe.mashsteps) {
                alert ("No mash steps found in recope, invalid recipe!");
                return null;
            }
            let recipe_mash_steps = recipe.mashsteps.
                    filter(function(x) {return (x.mashtype == 'Sparge' || x.mashtype == 'Infusion')});
            let recipe_mash_temps = recipe_mash_steps.
                    map(function(x){return Math.round(x.temp)});
            let mashin_temp = recipe_mash_temps[0];
            let recipe_mash_times = recipe_mash_steps.map(function(x){return x.mashtime});
            recipe_mash_times = recipe_mash_times.concat(mash_steps_times).slice(0,5);
            recipe_mash_temps = recipe_mash_temps.concat(mash_steps_temps).slice(0,5);
            

            let recipe_mash_elements = recipe_mash_times.map(function (e,i) { return [e,recipe_mash_temps[i]] });
            let mash_steps_string = recipe_mash_elements.map(function(e) {return [e[1],e[0]].join('X')}).join('X')

            let hop_times = recipe.hops.
                    filter(function(x) {return x.hopuse == 'Boil' || x.hopuse == 'Whirlpool'}).
                    map(function (x) {return x.hoptime});
            let other_times = recipe.others.
                    filter(function(x) {return x.otheruse == 'Boil' || x.otheruse == 'Whirlpool'}).
                    map(function (x) {return x.othertime});
            hop_times = hop_times.concat(other_times);
            let spice_steps_unique = hop_times.filter(function(value, index, self) { //array unique
                return self.indexOf(value) === index;
            }).sort(function(a,b) {return a-b}).reverse();
            let spice_steps_string = spice_steps_unique.concat(spice_additions).slice(0,6).join('X');

            let name = recipe.recipe.title;
            let boil_time=recipe.recipe.boiltime || 60;
            let recipe_name = recipe.recipe.title.replace(/ /g,'_');
            let recipe_string =
                    [recipe_no,
                     Math.round(mashin_temp),
                     mash_steps_string,
                     Math.round(boil_time),
                     Math.round(boil_temp),
                     spice_steps_string].
                    join('X')+'.'+recipe_name;
            console.log ("Recipe-string: "+recipe_string);
            speidellib.sendrz
            (
                this.speidel,
                recipe_string,
                9,
                this.populateRecipesdata,
                this.speidelNotfound,
            );


        },
        populateRecipesdata: function (data) {
            this.recipes = data;
            this.speidelvisible = 'visible';
            this.loading_speidel = false;
            
        },
        genLabel: function (data) {
            let url = 'http://localhost:5000/beer-label.cgi?'
            let recipe = app.$data.bfrecipe;
            url = url + 'name=' + encodeURIComponent(recipe.recipe.title);
            url = url + '&title_size=0';
            url = url + '&barcode_url=' + encodeURIComponent(recipe.recipe.recipeViewUrl);
            console.log ('genlabel, uri:' + url);
            document.getElementById('label').src = url;
        },
        loadRecipes: function () {
            this.loading_speidel = true;
            speidellib.getrz
            (
                this.speidel,
                this.populateRecipesdata,
                this.speidelNotfound
            );
            
        },
        removeRecipe: function (event) {
            speidellib.delrz
            (
                this.speidel,
                event.currentTarget.id,
                this.populateRecipesdata,
                this.nofunc
            );
            console.log ("remove "+event.currentTarget.id);
        },
        speidelNotfound: function (error, obj) {
            this.loading_speidel = false;
            alert ("No response from Speidel, try again and/or doublecheck IP/Name");
            this.speidelvisible = 'hidden';
        },
        nofunc: function () {
        },
        drop_handler: function (ev) {
            console.log("Drop");
            console.log(ev);
            ev.stopPropagation();
            ev.preventDefault();
            let vue = this;
            // If dropped items aren't files, reject them
            var dt = ev.dataTransfer;
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
                        var recipes = Brauhaus.Recipe.fromBeerXml(contents);
                        console.log ("recipes: "+recipes);
                        var recipe_string = speidellib.beerxml2speidel(recipes);
                        if (recipe_string) {
                            speidellib.sendrz
                            (
                                vue.speidel,
                                recipe_string,
                                9,
                                vue.populateRecipesdata,
                                vue.nofunc,
                            );
                        }
                        // await sleep(2000);

                    });
                    reader.readAsText(file);
                    console.log("... file[" + i + "].name = " + file.name);
                }  
            }
        },
        query_args: function (key) {
            key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, "\\$&"); // escape RegEx meta chars
            var match = location.search.match(new RegExp("[?&]"+key+"=([^&]+)(&|$)"));
            return match && decodeURIComponent(match[1].replace(/\+/g, " "));
        }
    }
})
