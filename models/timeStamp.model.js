var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var Schema = mongoose.Schema;

var TimeStampSchema = new mongoose.Schema({
    id: String, 
    updateDate: String,
});

TimeStampSchema.plugin(mongoosePaginate);
const TimeStamp = mongoose.model('TimeStamp', TimeStampSchema);

module.exports = TimeStamp;