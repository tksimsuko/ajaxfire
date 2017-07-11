/*
 * AjaxFire
 * Copyright 2017 tksimsuko.
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @param strategy optional  parallel or series / default parallel 
 * @param ajaxProp optional
*/
function AjaxFire(paramStrategy, ajaxProp){
    var tempStrategy = paramStrategy;
    if(typeof(paramStrategy) === 'object'){
        ajaxProp = paramStrategy;
        tempStrategy = 'parallel';
    }
    var ajax = Ajax(ajaxProp);

    return {
        series: function(ary){
            //none
            if(!ary){
                return generate('series');
            }
            //object array
            if(typeof(ary) === 'object'){
                 return generate('series').array(ary);
            }
            //url string array
            var list = Array.prototype.slice.call(arguments);
            return generate('series').array(list);
        },
        parallel: function(ary){
            //none
            if(!ary){
                return generate('parallel');
            }
            //object array
            if(typeof(ary) === 'object'){
                 return generate('parallel').array(ary);
            }
            //url string array
            var list = Array.prototype.slice.call(arguments);
            return generate('parallel').array(list);
        },
        get: function(url, param){
            return generate(tempStrategy).get(url, param);
        },
        post: function(url, data, param){
            return generate(tempStrategy).post(url, data, param);
        },
        send: function(method, url, data, param){
            return generate(tempStrategy).send(method, url, data, param);
        }
    };

    ////////// closure generator //////////
    function generate(fireStrategy){
        return {
            get: function(url, prop){
                return this.send('GET', url, null, prop);
            },
            post: function(url, data, prop){
                return this.send('POST', url, data, prop);
            },
            send: function(method, url, data, prop){
                if(!this.fire){
                    this.fire = AsyncFire(fireStrategy);
                }

                var that = this;
                this.fire.set(function(each, results, index){
                    if(!method){
                        method = 'GET';//default method GET
                    }
                    var sendData = data;
                    if(typeof(data) === 'function'){
                        //generate request data  from response data
                        //series only
                        sendData = data(results, index);
                    }

                    ajax
                        .send(method, url, sendData, prop)
                        .done(function(data, xhr){
                            results[index] = data;
                            each();
                        })
                        .fail(function(xhr){
                            results[index] = xhr;
                            if(that.fire.error(xhr, results, index)){
                                return;
                            }
                            each();
                        });
                });
                return this;
            },
            array: function(ary){
                var that = this;
                ary.forEach(function(ajaxObject, index){
                    if(typeof(ajaxObject) === 'object'){
                        that.send(ajaxObject.method, ajaxObject.url, ajaxObject.data, ajaxObject.prop);
                    }else if(typeof(ajaxObject) === 'string'){
                        that.send('GET', ajaxObject);
                    }
                    
                });
                return this;
            },
            map: function(callback){
                this.fire.onEach(callback);
                return this;
            },
            done: function(callback){
                this.fire.onDone(callback);
                return this;
            },
            catch: function(callback){// callback return true -> stop series processing
                this.fire.onError(callback);
                return this;
            }
        }
    }

    /* Ajax */
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

    /* AsyncFire */
    function AsyncFire(paramStrategy){
        var strategy = paramStrategy || 'parallel';
        return Flow(strategy);
        
        ////////// closure generator //////////
        //Flow
        // 処理を登録する
        // 処理の実行・制御をStrategyFlowに依頼する
        // instance - task, strategyFlow, set, start, each, done
        function Flow(flowStrategy){
            return {
                set: function(func){
                    if(!this.task){
                        this.task = new Task();
                        this.strategyFlow = generateStrategyFlow(flowStrategy);
                    }

                    this.task.funcs.push(func);
                    this.strategyFlow.execute(this);

                    return this;
                },
                onEach: function(callback){
                    this.each = callback;
                    return this;
                },
                onDone: function(callback){
                    this.done = callback;
                    return this;
                },
                onError: function(callback){
                    this.error = callback;
                    return this;
                }
            };
        }
        //処理を実行・制御する
        //並行処理フロー
        // instance - flow, start, each, isDone
        function ParallelFlow(){
            var current = 0;
            var doneCount = 0;

            return {
                execute: function(flow){
                    if(!this.flow){
                        this.flow = flow;
                    }

                    this.executeByIndex(current);
                    current++;
                },
                executeByIndex(index){
                    var that = this;
                    this.flow.task.funcs[index](function(){
                        that.each(that.flow.task.results, index);
                    }, that.flow.task.results, index);
                },
                each: function(results, index){
                    if(this.flow.each){
                        this.flow.each(results, index);
                    }
                    
                    //終了判定
                    doneCount++;
                    if(this.isDone() && this.flow.done){
                        this.flow.done(this.flow.task.results);
                    }
                },
                isDone: function(){
                    return doneCount === this.flow.task.funcs.length;
                }
            };
        }
        //処理を実行・制御する
        //直列処理フロー
        //次へ進む場合はnextを呼ばなければならない
        // instance - flow, start, next, isDone
        function SeriesFlow(){
            var current = 0;
            var doneCount = 0;

            return {
                execute: function(flow){
                    if(!this.flow){
                        this.flow = flow;
                    }
                    if(this.isWaiting()){
                        return;
                    }

                    this.next();
                },
                executeByIndex: function(index){
                    var that = this;
                    this.flow.task.funcs[index](function(){
                        if(that.flow.each){
                            that.flow.each(that.flow.task.results, index);
                        }
                        doneCount++;

                        that.next();
                    }, that.flow.task.results, index);
                },
                next: function(){
                    //終了判定
                    if(this.isDone()){
                        if(this.flow.done){
                            this.flow.done(this.flow.task.results);
                        }
                        return;
                    }

                    //処理実行
                    this.executeByIndex(current);
                    current++;
                },
                isWaiting: function(){
                    return current != doneCount;
                },
                isDone: function(){
                    return doneCount === this.flow.task.funcs.length;
                }
            };
        }
        //Task
        //一纏まりの処理
        function Task(){
            return {
                funcs: [],
                results: {}
            };
        }
        ///// function
        function generateStrategyFlow(strategy){
            switch(strategy){
                case 'parallel':
                    return ParallelFlow();
                case 'series':
                    return SeriesFlow();
                default:
                    break;
            }
        }
    }
}