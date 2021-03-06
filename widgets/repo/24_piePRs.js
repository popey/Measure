var moment = require("moment");
module.exports = function(options, callback) {
    /* Issues who were opened by someone who at the time was
       a member of one of our orgs */
    var orgUsers = {};
    var orgUserNames = new Set();
    (options.config.my_organizations || []).forEach(orgName => {
        var orgPeople = options.org2People[orgName];
        if (orgPeople) {
            orgPeople.forEach(p => {
                if (!orgUsers[p.login]) orgUsers[p.login] = [];
                orgUsers[p.login].push({
                    joined: p.joined ? moment(p.joined) : moment("1900-01-01"),
                    left: p.left ? moment(p.left) : moment()
                })
                orgUserNames.add(p.login);
            })
        }
    });

    options.db.pull_request.find({state: "open"},{"user.login":1,created_at:1}).toArray().then(openIssues => {
        var openedByOrg = 0, openedNotByOrg = 0;
        openIssues.forEach(i => {
            if (orgUserNames.has(i.user.login)) {
                var ci = moment(i.created_at);
                var isin = false;
                orgUsers[i.user.login].forEach(daterange => {
                    if (ci.isAfter(daterange.joined) && ci.isBefore(daterange.left)) {
                        isin = true;
                    }
                })
                if (isin) {
                    openedByOrg += 1;
                } else {
                    openedNotByOrg += 1;
                }
            } else {
                openedNotByOrg += 1;
            }
        });
        var graph = {
            title: "Open pull requests",
            graphdata: JSON.stringify({
                type: "doughnut",
                data: {
                    labels: ["Outside:", "Inside:"],
                    datasets: [{
                        data: [openedNotByOrg, openedByOrg],
                        backgroundColor: [options.COLORS[0], options.COLORS[1]]
                    }]
                }
            })
        }
        options.templates.graph(graph, callback);
    }).catch(e => { callback(e); });
}