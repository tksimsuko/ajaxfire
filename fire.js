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
