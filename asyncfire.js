/*
 * AsyncFire
 * Copyright 2017 tksimsuko.
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php  
*/
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
