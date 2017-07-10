/*
 * AjaxFire
 * Copyright 2017 tksimsuko.
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @param strategy  @optional @type string parallel or series / default parallel 
 * @param ajaxParam @optional
*/
function AjaxFire(paramStrategy, ajaxParam){
    var strategy = paramStrategy;
    if(typeof(paramStrategy) === 'object'){
        ajaxParam = paramStrategy;
        strategy = 'parallel';
    }
    var ajax = Ajax(ajaxParam);

    return {
        series: function(){
            strategy = 'series';
            return this;
        },
        parallel: function(){
            strategy = 'parallel';
            return this;
        },
        get: function(url, param){
            return generate().get(url, param)
        },
        post: function(url, data, param){
            return generate().post(url, data, param)
        },
        send: function(method, url, data, param){
            return generate().send(method, url, data, param);
        }
    };

    ////////// clousure generator //////////
    function generate(){
        return {
            get: function(url, param){
                return this.send('GET', url, null, param);
            },
            post: function(url, data, param){
                return this.send('POST', url, data, param);
            },
            send: function(method, url, data, param){
                if(!this.fire){
                    this.fire = AsyncFire(strategy);
                }

                var that = this;
                this.fire.set(function(each, results, index){
                    var sendData = data;
                    if(typeof(data) === 'function'){
                        //generate request data  from response data
                        //series only
                        sendData = data(results, index);
                    }

                    ajax
                        .send(method, url, sendData, param)
                        .done(function(data, xhr){
                            results[index] = data;
                            each();
                        })
                        .fail(function(error, xhr){
                            results[index] = {//TODO エラーに必要な項目の精査
                                error: error,
                                xhr: xhr
                            };

                            if(that.fire.error(error, xhr, results, index)){
                                return;
                            }
                            each();
                        });
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
}
/*
 * Ajax
 * Copyright 2017 tksimsuko.
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php  
 * 
 * @param
 *   headers
 *   requestType
 *   responseType
 *   withCredentials
 *   timeout
 *   onTimeout
 *   onDone
 *   onFail
 *
 * @function
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
function Ajax(defaultParam){
    return {
        send: generate,
        get: function(url, param){
            return generate('GET', url, null, param);
        },
        post: function(url, data, param){
            return generate('POST', url, data, param);
        }
    };
    
    ///// function
    function generate(method, url, data, param){
        var ajaxInstance = instance();
        if(defaultParam){
            ajaxInstance.set(defaultParam);
        }
        if(param){
            ajaxInstance.set(param);
        }
        return ajaxInstance.send(method, url, data);
    }
    ///// clousure generator
    function instance(method, url, data){
        return {
            prop: {},
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
                            if(that.prop.onDone){
                                that.prop.onDone(that.xhr.response, that.xhr);
                            }
                        }else{
                            if(that.prop.onFail){
                                that.prop.onFail(event, that.xhr);
                            }
                        }
                    }
                };

                this.xhr.open(method, url);

                if(this.prop.headers){
                    for(var key in this.prop.headers){
                        this.xhr.setRequestHeader(key, this.prop.headers[key]);
                    }
                }
                if(this.prop.requestType){
                    this.xhr.setRequestHeader('Content-Type', this.prop.requestType);
                }
                if(this.prop.responseType){
                    this.xhr.responseType = this.prop.responseType;
                }
                if(this.prop.withCredentials){
                    this.xhr.withCredentials = true;
                }
                if(this.prop.timeout){
                    this.xhr.timeout = this.prop.timeout;
                }
                if(this.prop.onTimeout){
                    this.xhr.ontimeout = this.prop.onTimeout;
                }

                if(typeof(data) === 'object'){
                    data = JSON.stringify(data);
                }
                this.xhr.send(data);
                return this;
            },
            done: function(callback){
                if(callback){
                    this.prop.onDone = callback;
                }
                return this;
            },
            fail: function(callback){
                if(callback){
                    this.prop.onFail = callback;
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
/*
 * AsyncFire
 * Copyright 2017 tksimsuko.
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php  
*/
function AsyncFire(paramStrategy){
    var strategy = paramStrategy || 'parallel';
    return Flow(strategy);
    
    ////////// clousure generator //////////
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
