# ajaxfire

## example

### parallel

    AjaxFire({responseType: 'document'})
      .get('http://localhost')
      .get('http://google.co.jp')
      .get('http://yahoo.co.jp')
      .map(function(results, index){
          console.log('map', index, results[index].URL);
      })
      .done(function(results){
          console.log('done');
      });

console log

    map 1 http://google.co.jp/
    map 0 http://localhost/
    map 2 http://yahoo.co.jp/
    done

### series

    AjaxFire('series', {responseType: 'document'})
      .get('http://localhost')
      .get('http://google.co.jp')
      .get('http://yahoo.co.jp')
      .map(function(results, index){
          console.log('map', index, results[index].URL);
      })
      .done(function(results){
          console.log('done');
      });


console log

    map 0 http://localhost/
    map 1 http://google.co.jp/
    map 2 http://yahoo.co.jp/
    done


### post

    var ajaxfire = AjaxFire();
    ajaxfire
      .get('http://localhost/data')
      .post('http://localhost/update', data);

#### use resposne data
    ※series only

    var ajaxfire = AjaxFire();
    ajaxfire
      .get('http://localhost/data')
      .post('http://localhost/update', function(results, index){
        return results[index - 1];//use response data
    });

### catch error

    var ajaxfire = AjaxFire('series', {responseType: 'document'});
    ajaxfire
      .get('http://localhost')
      .get('http://localhost/error_page')
      .get('http://google.co.jp')
      .get('http://yahoo.co.jp')
      .map(function(results, index){
          console.log('map', index, results[index].URL);
      })
      .done(function(results){
          console.log('done');
      })
      .catch(function(xhr, results, index){
          console.log(xhr.status, xhr.statusText);
      });

console log

    map 0 http://localhost/
    404 "Not Found"
    map 1 undefined
    map 2 http://google.co.jp/
    map 3 http://yahoo.co.jp/
    done

#### stop process

    ※series only

    ~
    .catch(function(xhr, results, index){
        console.log(xhr.status, xhr.statusText);
        return true;// -> stop ajax proccess.
    });

console log

    map 0 http://localhost/
    404 "Not Found"

### array

#### parallel

    ajaxfire.parallel(
      'http://google.co.jp',
      'http://yahoo.co.jp',
      'http://localhost'
    ).map(function(results, index){
      console.log('map', index);
    }).done(function(results){
	    console.log('done!');
    }).catch(function(xhr){
	    console.log('error catch!');
    });

console log

    map 1
    map 2
    map 0
    done!

#### series

    ajaxfire.series(
      'http://google.co.jp',
      'http://yahoo.co.jp',
      'http://localhost'
    ).map(function(results, index){
      console.log('map', index);
    }).done(function(results){
      console.log('done!');
    }).catch(function(xhr){
      console.log('error catch!');
    });

console log

    map 0
    map 1
    map 2
    done!

#### various

    ajaxfire.series([
        {method: 'GET', url: 'http://google.co.jp'},
        {method: 'POST', url: 'http://localhost/data', data: {}}
    )].map(function(results, index){
        console.log('map', index);
    }).done(function(results){
        console.log('done!');
    }).catch(function(xhr){
        console.log('error catch!');
    });
