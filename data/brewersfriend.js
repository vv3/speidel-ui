// https://eloquentjavascript.net/10_modules.html
(function(exports) {
    exports.getrecipes = function (api_url, api_key, api_email, returndata, failure) {
        var data = new FormData();
        data.append('api_key', api_key);
        data.append('api_email', api_email);
        $.ajax({
            url:api_url,
            data:data,
            //cache:false,
            crossDomain:true,
            method:'POST',
            type: 'POST',
            processData: false,
            contentType: false,
            async:true,
            timeout:30000,
            beforeSend:function(obj){
	        console.log("Before Post ("+api_url+"): "+ new Date());
            }
        }).done(function(data){
            if (returndata) {
                returndata(data);
            }
        }).fail(function(obj,textStat,error){
            $('upload_status').text('Upload FAILED!');
            console.log("Error date: "+ (new Date()));	
            console.log("Error: "+textStat);
            console.log("Error Object: "+error);
            console.log("Object: "+obj);
            if (failure) {
                failure(obj, error);
            }
        });
    }

    
})(this.brewersfriend = {});
