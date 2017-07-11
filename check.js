var ajaxfire = AjaxFire('series', {responseType: 'document'});
ajaxfire
    .get('http://google.co.jp')
    .get('http://yahoo.co.jp')
    .get('https://news.google.com')
    .get('https://www.pinterest.jp')
    .get('https://vuejs.org')
    .map(function(results, index){
        console.log('1 ajaxfire map', results, index);
    })
    .catch(function(error, xhr, results, index){
        console.log('on error', error, xhr);
        return true;
    })
    .done(function(results){
        console.log('1 ajaxfire done', results);
    });


ajaxfire
    .get('http://google.co.jp')
    .get('http://yahoo.co.jp')
    .post('http://localhost', function(results, index){
        console.log('localhost post', results, index);
        return results;
    })
    .get('https://news.google.com')
    .get('https://www.pinterest.jp')
    .get('https://vuejs.org')
    .map(function(results, index){
        console.log('1 ajaxfire map', results, index);
    })
    .catch(function(error, xhr, results, index){
        console.log('on error', error, xhr);
        return true;
    })
    .done(function(results){
        console.log('1 ajaxfire done', results);
    });
ajaxfire
    .get('http://google.co.jp')
    .get('http://yahoo.co.jp')
    .get('https://news.google.com')
    .map(function(results, index){
        console.log('2 ajaxfire map', results, index);
    })
    .done(function(results){
        console.log('2 ajaxfire done', results);
    });

