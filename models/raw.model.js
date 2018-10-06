var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var Schema = mongoose.Schema;

var RawSchema = new mongoose.Schema({
    id: String, 
    content: Schema.Types.Mixed,
    updateDate: String,
});

RawSchema.plugin(mongoosePaginate);
const Raw = mongoose.model('Raw', RawSchema);

module.exports = Raw;