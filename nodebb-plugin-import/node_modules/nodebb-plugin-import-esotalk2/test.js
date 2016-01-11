var fs = require('fs-extra');

require('./index').paginatedTestrun({
    dbhost: 'localhost',
    dbport: 3306,
    dbname: 'esotalk',
    dbuser: 'user',
    dbpass: 'password',

    tablePrefix: 'et_'
}, function(err, results) {
    console.log(err);
    // fs.writeFileSync('./results.json', JSON.stringify(results, undefined, 2));
});