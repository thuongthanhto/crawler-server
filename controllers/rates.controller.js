var RateService = require('../services/rate.service');
const puppeteer = require('puppeteer');

_this = this;

exports.getRawDataById = async function(req, res) {
  var logStatus = [];
  var id = req.params.id;
  console.log('This is id of case: ', id);
  var urlOfCase = '[href="myloans.aspx?Fn=Select&LoanID=' + id + '&Target=P"]';
  console.log('This is url of case: ', urlOfCase);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1024,
  });
  try {
    await page.goto('https://epps.elliemae.com/login.aspx');
    req.io.sockets.emit(
      'logs',
      'Go to https://epps.elliemae.com/login.aspx success'
    );
    await page.type('[name="id"]', 'cindyliu888');
    await page.type('[name="pw"]', 'Welcome2015');
    await page.click('[onclick="return DoLogin(this);"]');
    await page.waitFor(2 * 1000);

    await page.click('[href="myloans.aspx?Fn=ShowMore&HowMany=100"]');
    req.io.sockets.emit('logs', 'Login success');
    req.io.sockets.emit('logs', 'Click show 100 row success');
    await page.waitFor(7 * 1000);
    await page.click(urlOfCase);
    await page.waitFor(5 * 1000);
    req.io.sockets.emit('logs', 'Click ' + urlOfCase + ' success');
    await page.click('[name="Qualify"]');
    await page.waitFor(5 * 1000);
    req.io.sockets.emit('logs', 'Click button Qualify success');

    const sessionCookies = await page.cookies();
    var cookie =
      sessionCookies[0].name +
      '=' +
      sessionCookies[0].value +
      '; ' +
      sessionCookies[2].name +
      '=' +
      sessionCookies[2].value +
      '; ' +
      sessionCookies[1].name +
      '=' +
      sessionCookies[1].value;
    console.log(cookie);
    req.io.sockets.emit('logs', 'Cookie of page: ' + cookie);

    try {
      req.io.sockets.emit('logs', 'Start process data');
      RateService.getRawDataOfAllLenderById(req, res, cookie, id, function(
        value
      ) {
        if (value == 'success') {
          RateService.processRawDataById(req, id, function(value) {
            if ((value = 'success')) {
              return res.status(200).json({
                status: 200,
                data: value,
                message: 'Update success',
              });
            } else {
              return res.status(400).json({
                status: 400,
                data: value,
                message: 'Update success',
              });
            }
          });

          browser.close();
        } else {
          console.log(value);
          browser.close();
        }
      });
    } catch (e) {
      browser.close();
      console.log(error);
      req.io.sockets.emit('logs', 'Error process data');
      return res.status(400).json({
        status: 400,
        data: error,
        message: 'Error, Please check data!',
      });
    }
  } catch (error) {
    browser.close();
    console.log(error);
    req.io.sockets.emit('logs', 'Error puppeteer');
    return res.status(400).json({
      status: 400,
      data: error,
      message: 'Error puppeteer or network slow. Please try again!',
    });
  }
};

exports.getTimeStamp = async function(req, res) {
  try {
    RateService.getTimeStamp(req, res, function(value) {
      if (value) {
        return res.status(200).json({
          status: 200,
          data: value,
          message: 'list timestamp',
        });
      }
    });
  } catch (e) {
    return res.status(400).json({
      status: 400,
      data: e,
      message: e.message,
    });
  }
};
