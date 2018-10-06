const request = require('request');
const fs = require('fs');
const mongoose = require('mongoose');
const db = mongoose.connect(
  'mongodb://thuongthanhto:toilaThuong1@ds129004.mlab.com:29004/thuongthanhto'
);
var Raw = require('./../models/raw.model');
var TimeStamp = require('./../models/timeStamp.model');

module.exports = {
  getRawDataOfAllLenderById: getRawDataOfAllLenderById,
  processRawDataById: processRawDataById,
  convertArrayFromRawData: convertArrayFromRawData,
  returnObjectLender: returnObjectLender,
  addValueToHeader: addValueToHeader,
  processLenderFlowYear: processLenderFlowYear,
  updateRateById: updateRateById,
  postLender: postLender,
  putLender: putLender,
  getTimeStamp: getTimeStamp,
  setRaw: setRaw,
};

function getRaw(id, callback) {
  Raw.findOne(
    {
      id: id,
    },
    function(err, data) {
      if (err) {
        callback('error');
      } else {
        callback(data);
      }
    }
  );
}

function getTimeStamp(req, res, callback) {
  TimeStamp.find({}, function(err, data) {
    if (err) {
      callback('error');
    } else {
      callback(data);
    }
  });
}

function setRaw(id, json, callback) {
  var query = {
    id: id,
  };
  var update = {
    id: id,
    content: json,
    updateDate: new Date()
      .toISOString()
      .replace(/T/, ' ')
      .replace(/\..+/, ''),
  };
  var options = {
    upsert: true,
  };
  Raw.findOneAndUpdate(query, update, options, function(err, mov) {
    if (err) {
      callback(err);
    } else {
      callback('success');
    }
  });
}

function setTimeStamp(id) {
  var query = {
    id: id,
  };
  var update = {
    id: id,
    updateDate: new Date()
      .toISOString()
      .replace(/T/, ' ')
      .replace(/\..+/, ''),
  };
  var options = {
    upsert: true,
  };
  TimeStamp.findOneAndUpdate(query, update, options, function(err, mov) {
    if (err) {
    } else {
    }
  });
}

function processLenderFlowYear(program, listValueDetail) {
  var array = [];
  var arrayRate = [];
  listValueDetail.forEach(element => {
    if (element.ProgramID == program.ProgramID) {
      array.push(element);
    }
  });
  array.forEach(element => {
    arrayRate.push({ Rate: element.Rate, Price: element.Price });
  });
  return arrayRate;
}

function addValueToHeader(arrayHeader, arrayValue) {
  var object = {};
  for (i = 0; i < arrayHeader.length; i++) {
    if (arrayValue[i] == undefined) {
      object[arrayHeader[i]] = null;
    } else {
      object[arrayHeader[i]] = arrayValue[i];
    }
  }
  return object;
}

function convertArrayFromRawData(array) {
  var arrayLender = [];
  for (j = 1; j < array.length; j++) {
    var object = addValueToHeader(array[0], array[j]);
    arrayLender.push(object);
  }
  return arrayLender;
}

function returnObjectLender(
  lenderName,
  listLender,
  listValue,
  fix30,
  fix15,
  arm51,
  arm71,
  arm101
) {
  var list30 = [];
  var list15 = [];
  var list51 = [];
  var list71 = [];
  var list101 = [];
  listLender.forEach(element => {
    if (element.Program == fix30) {
      list30 = processLenderFlowYear(element, listValue);
    }
    if (element.Program == fix15) {
      list15 = processLenderFlowYear(element, listValue);
    }
    if (element.Program == arm51) {
      list51 = processLenderFlowYear(element, listValue);
    }
    if (element.Program == arm71) {
      list71 = processLenderFlowYear(element, listValue);
    }
    if (element.Program == arm101) {
      list101 = processLenderFlowYear(element, listValue);
    }
  });
  if (fix30 == '' && fix15 == '') {
    var myJSONObject = {
      lender_name: lenderName,
      RATE_JUMBO: { '5/1-ARM': list51, '7/1-ARM': list71, '10/1-ARM': list101 },
    };
  } else if (list51.length == 0 && list71.length == 0 && list101.length == 0) {
    var myJSONObject = {
      lender_name: lenderName,
      RATE_JUMBO: { '30-FIXED': list30, '15-FIXED': list15 },
    };
  } else {
    var myJSONObject = {
      lender_name: lenderName,
      RATE_JUMBO: {
        '30-FIXED': list30,
        '15-FIXED': list15,
        '5/1-ARM': list51,
        '7/1-ARM': list71,
        '10/1-ARM': list101,
      },
    };
  }

  return myJSONObject;
}

function getRawDataOfAllLenderById(req, res, cookie, id, callback) {
  request(
    {
      method: 'GET',
      url: 'https://epps.elliemae.com/pricing/qsub.aspx?Fn=qualify&undefined',
      headers: {
        'content-type': 'application/json',
        cookie: cookie,
      },
    },
    function(error, response, body) {
      if (error) {
        callback(error);
      } else {
        const RATE = eval(body);
        console.log(RATE);
        try {
          object = RATE;
          const OBJECT = { RATES: object };

          setRaw(id, JSON.stringify(OBJECT, null, '   '), function(value) {
            if (value == 'success') {
              callback('success');
              req.io.sockets.emit('logs', 'Call api set raw data success');
            } else {
              req.io.sockets.emit('logs', 'Call api set raw data error');
              callback('error');
            }
          });
        } catch (e) {
          console.log(e);
          req.io.sockets.emit('logs', 'Invalid cookie');
          callback('error puppeteer');
        }
      }
    }
  );
}

function processRawDataById(req, id, callback) {
  getRaw(id, function(value) {
    if (value === 'error') {
      req.io.sockets.emit('logs', 'Get raw data error');
      callback('error');
    } else {
      req.io.sockets.emit('logs', 'Get raw data success and processing it');
      var jsonContent = JSON.parse(value.content);
      var listLender = convertArrayFromRawData(jsonContent.RATES[3]);
      var listGMCC_Gold = [];
      var listGMCC_Bronze = [];
      var listGMCC_UlyssesUST = [];
      var listGMCC_UlyssesLIBOR = [];
      var listGMCC_Diamond = [];
      var listGMCC_Silver = [];
      var listGMCC_SilverPreferredPayment = [];
      listLender.forEach(element => {
        if (element.Program.includes('GMCC - Gold')) {
          listGMCC_Gold.push(element);
        }
        if (element.Program.includes('GMCC - Bronze')) {
          listGMCC_Bronze.push(element);
        }
        if (element.Program.includes('GMCC - Ulysses Elite UST')) {
          listGMCC_UlyssesUST.push(element);
        }
        if (element.Program.includes('GMCC - Ulysses Elite LIBOR')) {
          listGMCC_UlyssesLIBOR.push(element);
        }
        if (element.Program.includes('GMCC-InHouseAgncy-Diamond')) {
          listGMCC_Diamond.push(element);
        }
        if (element.Program.includes('GMCC-InHouse Agncy-Silver')) {
          if (
            element.Program.includes(
              'GMCC-InHouse Agncy-Silver Non-Conf Conv Preferred Payment'
            )
          ) {
            listGMCC_SilverPreferredPayment.push(element);
          } else {
            listGMCC_Silver.push(element);
          }
        }
      });

      var listValue4 = convertArrayFromRawData(jsonContent.RATES[4]);
      var listValue7 = convertArrayFromRawData(jsonContent.RATES[7]);
      var listValue = listValue4;

      var objectGMCC_Gold = returnObjectLender(
        'GMCC - Gold',
        listGMCC_Gold,
        listValue,
        'GMCC - Gold Preferred Fixed 30',
        'GMCC - Gold Preferred Fixed 15',
        'GMCC - Gold Preferred ARM 5/1',
        'GMCC - Gold Preferred ARM 7/1',
        'GMCC - Gold Preferred ARM 10/1'
      );
      var objectGMCC_Bronze = returnObjectLender(
        'GMCC - Bronze',
        listGMCC_Bronze,
        listValue,
        'GMCC - Bronze Jumbo Advantage Fixed 30',
        'GMCC - Bronze Jumbo Advantage Fixed 15',
        'GMCC - Bronze Jumbo Advantage 5/1 LIBOR ARM',
        'GMCC - Bronze Jumbo Advantage 7/1 LIBOR ARM',
        'GMCC - Bronze Jumbo Advantage 10/1 LIBOR ARM'
      );
      var objectGMCC_UlyssesUST = returnObjectLender(
        'GMCC - UlyssesUST',
        listGMCC_UlyssesUST,
        listValue,
        '',
        '',
        'GMCC - Ulysses Elite UST 5/1 ARM',
        'GMCC - Ulysses Elite UST 7/1 ARM',
        'GMCC - Ulysses Elite UST 10/1 ARM'
      );
      var objectGMCC_UlyssesLIBOR = returnObjectLender(
        'GMCC - UlyssesLIBOR',
        listGMCC_UlyssesLIBOR,
        listValue,
        '',
        '',
        'GMCC - Ulysses Elite LIBOR 5/1 ARM',
        'GMCC - Ulysses Elite LIBOR 7/1 ARM',
        'GMCC - Ulysses Elite LIBOR 10/1 ARM'
      );
      var objectGMCC_Diamond = returnObjectLender(
        'GMCC - Diamond',
        listGMCC_Diamond,
        listValue,
        'GMCC-InHouseAgncy-Diamond Non-Agency Full Doc Fixed 30',
        'GMCC-InHouseAgncy-Diamond Non-Agency Full Doc Fixed 15',
        'GMCC-InHouseAgncy-Diamond Non-Agency Full Doc ARM 5/1 LIBOR',
        'GMCC-InHouseAgncy-Diamond Non-Agency Full Doc ARM 7/1 LIBOR',
        'GMCC-InHouseAgncy-Diamond Non-Agency Full Doc ARM 10/1 LIBOR'
      );
      var objectGMCC_Silver = returnObjectLender(
        'GMCC - Silver',
        listGMCC_Silver,
        listValue,
        'GMCC-InHouse Agncy-Silver Non-Conf Conv Fixed 30',
        'GMCC-InHouse Agncy-Silver Non-Conf Conv Fixed 15',
        'GMCC-InHouse Agncy-Silver Non-Conf Conv 5/1 LIBOR ARM',
        'GMCC-InHouse Agncy-Silver Non-Conf Conv 7/1 LIBOR ARM',
        'GMCC-InHouse Agncy-Silver Non-Conf Conv 10/1 LIBOR ARM'
      );
      var objectGMCC_SilverPreferredPayment = returnObjectLender(
        'GMCC - SilverPreferredPayment',
        listGMCC_SilverPreferredPayment,
        listValue,
        'GMCC-InHouse Agncy-Silver Non-Conf Conv Preferred Payment Plan Fixed 30',
        'GMCC-InHouse Agncy-Silver Non-Conf Conv Preferred Payment Plan Fixed 15',
        'GMCC-InHouse Agncy-Silver Non-Conf Conv Preferred Payment Plan ARM 5/1',
        'GMCC-InHouse Agncy-Silver Non-Conf Conv Preferred Payment Plan ARM 7/1',
        'GMCC-InHouse Agncy-Silver Non-Conf Conv Preferred Payment Plan ARM 10/1'
      );

      var objectNewDataRate = {
        objectGMCC_Gold: objectGMCC_Gold,
        objectGMCC_Bronze: objectGMCC_Bronze,
        objectGMCC_UlyssesUST: objectGMCC_UlyssesUST,
        objectGMCC_UlyssesLIBOR: objectGMCC_UlyssesLIBOR,
        objectGMCC_Diamond: objectGMCC_Diamond,
        objectGMCC_Silver: objectGMCC_Silver,
        objectGMCC_SilverPreferredPayment: objectGMCC_SilverPreferredPayment,
      };

      req.io.sockets.emit(
        'logs',
        'Process raw data success and update data to server'
      );
      putLender(objectNewDataRate.objectGMCC_Gold);
      putLender(objectNewDataRate.objectGMCC_Bronze);
      putLender(objectNewDataRate.objectGMCC_UlyssesUST);
      putLender(objectNewDataRate.objectGMCC_UlyssesLIBOR);
      putLender(objectNewDataRate.objectGMCC_Diamond);
      putLender(objectNewDataRate.objectGMCC_Silver);
      putLender(objectNewDataRate.objectGMCC_SilverPreferredPayment);
      req.io.sockets.emit('logs', 'Update done!');
      setTimeStamp(id);

      callback('success');
    }
  });
}

function postLender(myJSONObject) {
  request(
    {
      url: 'https://amiqualified.com/api/Lenders/add_lender_rate_table',
      method: 'POST',
      json: true,
      body: myJSONObject,
    },
    function(error, response, body) {}
  );
}

function putLender(myJSONObject) {
  request(
    {
      url: 'https://amiqualified.com/api/Lenders/update_lender_rate_table',
      method: 'PUT',
      json: true,
      body: myJSONObject,
    },
    function(error, response, body) {}
  );
}

async function updateRateById(id) {
  var inputUrl = './public/jsons/newRateData' + id + '.json';
  var content = fs.readFileSync(inputUrl);
  object = JSON.parse(content);

  await putLender(object.objectGMCC_Gold);
  await putLender(object.objectGMCC_Bronze);
  await putLender(object.objectGMCC_UlyssesUST);
  await putLender(object.objectGMCC_UlyssesLIBOR);
  await putLender(object.objectGMCC_Diamond);
  await putLender(object.objectGMCC_Silver);
  await putLender(object.objectGMCC_SilverPreferredPayment);

  return 'Update All Lender For Case ' + id + ' Success.';
}
