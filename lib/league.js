// League scraper
var request =  require('request'),
    cheerio =  require('cheerio'),
    validate = require('./validate');

// Fetch league information
exports.get = function(leagueType, leagueId, season, callback) {

  var url;
  // Validate a callback exists if not then we are expecting a URL
  if (typeof callback === typeof undefined) {
    callback = leagueId;
    if (!validate.url('league', leagueType)) { return callback('Invalid URL.'); }
    url = leagueType;
  } else {
    // Validate all required paramters
    if (!validate.leagueType(leagueType)) { return callback('Invalid league type.'); }
    if (!validate.leagueId(leagueId))     { return callback('Invalid league ID.'); }
    if (!validate.season(season))         { return callback('Invalid season.'); }
    url = 'http://www.fleaflicker.com/' + leagueType + '/leagues/' + leagueId + '?season=' + season + '&statType=1';
  };

  // Call to cheerio for the league
  request(url, function(error, response, body) {
    if (error || response.statusCode !== 200) {
      return callback(error ? error : 'Status Code: ' + response.statusCode);
    }
    // Proceed as if everything is okay
    $ = cheerio.load(body);
    // Extend for the body-left grab of content
    $.prototype.labelSearch = function(children, search) {
      return $(this).find(children).filter(function() {
        return $(this).text().trim() === search;
      }).next().text().trim();
    };

    // Get league information
    var league = {
      id: parseInt(url.match(/leagues\/(\d{5})/)[1]),
      name: $('#top-bar-container ul.breadcrumb li.active').text(),
      commish: $('#body-left .panel-body').labelSearch('dt', 'Commish'),
      type: $('#body-left .panel-body').labelSearch('dt', 'Type'),
      slots: {
        total: $('.table-group .user-name').length + $('.table-group a.btn-success').length,
        available: $('.table-group a.btn-success').length,
        taken: $('.table-group .user-name').length
      },
      teams: [],
      stats: []
    };

    // Teams in the league
    $('.table-group tr:nth-child(2) th .tt-content').each(function() {
      league.stats.push($(this).text());
    });

    // cheerio bug is forces it unable to find tbody for some odd reason
    for (var i = 0, l = $('.table-group .user-name').length; i < l; i++) {
      $('#row_0_0_' + i).each(function() {
        // Only take real teams
        if ($(this).find('td:first-child .league-name').length > 0) {
          var team = {
            name: $(this).find('td:first-child .league-name').text(),
            rank: $(this).find('td:last-child').text(),
            points: $(this).find('td:last-child').prev().text(),
            link: 'https://fleaflicker.com' + $(this).find('td.left .league-name a').attr('href'),
            id: $(this).find('td:first-child .league-name a').attr('href').match(/\/teams\/(\d{5,7})/)[1],
            owner: {
              name: $(this).find('.user-name').text(),
              link: 'https://fleaflicker.com' + $(this).find('.user-name').attr('href')
            },
            stats: {}
          };
          var row = $(this);
          // Push on the stats for the entire team
          league.stats.forEach(function(stat, index) {
            team.stats[stat] = {
              points: parseFloat(row.find('td:nth-child(' + (index + 4) + ')' + ' .text-muted').text()),
              value: parseFloat(row.find('td:nth-child(' + (index + 4) + ')' + ' .nowrap').text().replace(/,/g, ''))
            }
          });
          league.teams.push(team);
        }
      });
    }
    return callback(null, league);

  });

}
