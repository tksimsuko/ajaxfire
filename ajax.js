/*
 * Ajax
 * Copyright 2017 tksimsuko.
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php  
 * 
 * @param defaultProp
 *   headers - xhr request headers key value object
 *   requestType - request header Content-Type
 *   
 *   responseType - xhr propertie
 *   withCredentials - xhr propertie
 *   timeout - xhr propertie
 *   ontimeout - xhr propertie
 *   ※other　xhr properties are configuable
 *
 *@function
 *   get
 *   post
 *   send
 *
 * call after above function
 *   done
 *   fail
 *   abort
 * 
 * @activation object properties
 *   xhr
 * 
 * done called by 200/300 series status
 * fail called other than
*/
function Ajax(defaultProp){
    return {
        send: generate,
        get: function(url, prop){
            return generate('GET', url, null, prop);
        },
        post: function(url, data, prop){
            return generate('POST', url, data, prop);
        }
    };
    
    ///// function
    function generate(method, url, data, prop){
        var ajaxInstance = instance();
        if(defaultProp){
            ajaxInstance.set(defaultProp);
        }
        if(prop){
            ajaxInstance.set(prop);
        }
        return ajaxInstance.send(method, url, data);
    }
    ///// closure generator
    function instance(){
        return {
            prop: {},
            callback: {},
            set: function(added){
                if(!added){
                    return this;
                }

                for(var key in added){
                    this.prop[key] = added[key];
                }
                return this;
            },
            send: function(method, url, data){
                this.xhr = new XMLHttpRequest();

                var that = this;
                this.xhr.onreadystatechange = function(event){
                    if(that.xhr.readyState === that.xhr.DONE){
                        if(200 <= that.xhr.status && that.xhr.status < 400){//200 300 series status
                            if(that.callback.onDone){
                                that.callback.onDone(that.xhr.response, that.xhr);
                            }
                        }else{
                            if(that.callback.onFail){
                                that.callback.onFail(that.xhr);
                            }
                        }
                    }
                };

                this.xhr.open(method, url);

                //set xhr prop
                for(var key in this.prop){
                    if(key === 'headers'){
                        for(var key in this.prop.headers){
                            this.xhr.setRequestHeader(key, this.prop.headers[key]);
                        }
                        continue;
                    }
                    if(key === 'requestType'){
                        this.xhr.setRequestHeader('Content-Type', this.prop.requestType);
                        continue;
                    }

                    this.xhr[key] = this.prop[key];
                }

                if(typeof(data) === 'object'){
                    data = JSON.stringify(data);
                }
                this.xhr.send(data);
                return this;
            },
            done: function(callback){
                if(callback){
                    this.callback.onDone = callback;
                }
                return this;
            },
            fail: function(callback){
                if(callback){
                    this.callback.onFail = callback;
                }
                return this;
            },
            abort: function(){
                if(this.xhr){
                    this.xhr.abort();
                }
                return this;
            }
        };
    }
}
