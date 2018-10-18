var debug = require('debug')('botkit:webhooks:sf_cid');

module.exports = function(webserver, controller) {

  webserver.get('/sf/cid/:cNum', function(req, res) {

    const cNum = req.params.cNum;

    if (!cNum) {
      return res.json({
        ok: false,
        id: null
      });
    }

    controller.sfLib.getCase(cNum, (err, records) => {
      if (err)
        return console.error("error getting case details ", err);

      const result = records[0];

      res.status(200);
      res.json({
        ok: true,
        id: result.Id
      });
    });
  });
}
