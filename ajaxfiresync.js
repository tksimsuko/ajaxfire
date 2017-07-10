/*
 * AjaxFire
 * Copyright 2017 tksimsuko.
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @param strategy (parallel or series) default parallel
 * @param ajaxParam 
*/
function AjaxFire(strategy, ajaxParam){
    var ajax = Ajax(ajaxParam);

    return {
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
                    this.fire = Fire(strategy);
                }
                this.fire.set(function(each, results, index){
                    ajax
                        .send(method, url, data, param)
                        .done(function(data, xhr){
                            results[index] = data;
                            each();
                        })
                        .fail(function(error, xhr){
                            results[index] = {
                                error: error,
                                xhr: xhr
                            };
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
                this.fire.start();
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
 * Fire
 * Copyright 2017 tksimsuko.
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php  
*/
function Fire(paramStrategy){
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
                    this.task = new Task()
                }
                this.task.funcs.push(func);
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
            start: function(){
                this.strategyFlow = generateStrategyFlow(flowStrategy);
                this.strategyFlow.start(this);
                return this;
            }
        };
    }
    //処理を実行・制御する
    //並行処理フロー
    // instance - flow, start, each, isDone
    function ParallelFlow(){
        var count = 0;

        return {
            start: function(flow){//flow - Flow clousure
                this.flow = flow;
                
                //処理実行
                var that = this;
                this.flow.task.funcs.forEach(function(func, index){
                    func(function(){
                        that.each(that.flow.task.results, index);
                    }, that.flow.task.results, index);
                });
            },
            each: function(results, index){
                if(this.flow.each){
                    this.flow.each(results, index);
                }
                
                //終了判定
                count++;
                if(this.isDone()){
                    this.flow.done(this.flow.task.results);
                }
            },
            isDone: function(){
                return count === this.flow.task.funcs.length;
            }
        };
    }
    //処理を実行・制御する
    //直列処理フロー
    //次へ進む場合はnextを呼ばなければならない
    // instance - flow, start, next, isDone
    function SeriesFlow(){
        var current = 0;

        return {
            start: function(flow){//flow - Flow clousure
                this.flow = flow;
                this.next();
            },
            next: function(){
                //終了判定
                if(this.isDone()){
                    this.flow.done(this.flow.task.results);
                    return;
                }

                //処理実行
                var that = this;
                this.flow.task.funcs[current](function(){
                    if(that.flow.each){
                        that.flow.each(that.flow.task.results, current - 1);
                    }
                    that.next();
                }, that.flow.task.results, current);

                current++;
            },
            isDone: function(){
                return current === this.flow.task.funcs.length;
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
