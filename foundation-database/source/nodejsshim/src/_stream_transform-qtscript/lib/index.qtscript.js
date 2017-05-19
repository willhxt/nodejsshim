/**
 * Add a wrapper to stream.Transform so it can be accessed by:
 *   var Transform = require('_stream_transform');
 */
var Transform = require('stream').Transform;

module.exports = Transform;
