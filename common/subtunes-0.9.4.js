/*
 * Defines common functions for all devices
 */

/**
 * Encodes the given the string in hex format.
 */
Ext.ux.mattgoldspink.subsonic.hexEncode = function (data){
    var b16_digits = '0123456789abcdef', b16_map = [], i, result = [];
    for (i = 0; i < 256; i++) {
        b16_map[i] = b16_digits.charAt(i >> 4) + b16_digits.charAt(i & 15);
    }

    for (i = 0; i < data.length; i++) {
        result[i] = b16_map[data.charCodeAt(i)];
    }

    return result.join('');
};

Ext.ux.mattgoldspink.subsonic.isVersionGreaterThan = function(current, compareTo){
    var splitCurrent = current.split('.');
    var newVersion = compareTo.split('.');
    for (var i = 0; i < 3; i++) {
        if (splitCurrent[i] > newVersion[i]) {
            return true;
        }
    }
    return false;
};
/**
 * Defines the fields that are common to all stores,
 * Both touch and desktop devices
 */
Ext.ux.mattgoldspink.subsonic.Fields = [
    {name: 'name',         type: 'string'},
    {name: 'typeOfRequest',type: 'string'},
    {name: 'isDir',        type: 'boolean'},
    {name: 'id',           type: 'string'},
    {name: 'parent',       type: 'string'},
    {name: 'coverArt',     type: 'string'},
    {name: 'artist',       type: 'string'},
    {name: 'duration',     type: 'float'},
    {name: 'bitRate',      type: 'float'},
    {name: 'year',         type: 'float'},
    {name: 'genre',        type: 'string'},
    {name: 'album',        type: 'string'},
    {name: 'suffix',       type: 'string'},
    {name: 'track',        type: 'float'},
    {name: 'title',        type: 'string'},
    {name: 'playstate',    type: 'string'}
];
