/**
 * Created by Nigel.Britton on 23/07/2018.
 */

'use strict';

var fs = require('fs'),
    request = require('request'),
    md5 = require('md5'),
    debug = require('debug')('darkstar-auctionhouse-app:loadContent'),
    promise = require('promise');

const dataContent = require('./dataContent');

module.exports = function (contentConfig) {

    var contentService = {

        requestTimeout: 4000,
        cacheQueueInterval: 10,
        cacheQueue: [],
        cachedContent: {},
        cachedCharacters: {},
        popularContentCharacters: {},
        popularContentItems: {},

        contentEndpoints: {
            searchCharByName: {
                method: 'post',
                url: '',
                fields: {
                    type: 'text',
                    name: 'charname'
                }
            },
            searchChar: {
                method: 'post',
                url: '',
                fields: {
                    type: 'number',
                    name: 'charid'
                }
            },
            searchItemByName: {
                method: 'post',
                url: '',
                fields: {
                    type: 'text',
                    name: 'itemname'
                }
            },
            searchItem: {
                method: 'post',
                url: '',
                fields: {
                    type: 'number',
                    name: 'itemid'
                }
            },
        }

    };

    setInterval(function () {
        contentService.cacheStorage();
    }, 1000 * contentService.cacheQueueInterval);

    /**
     * updatePopularCharacter
     * @param charid number
     * @param charname string
     */
    contentService.updatePopularCharacter = function (charid, charname) {
        if (!this.popularContentCharacters[charid]) { this.popularContentCharacters[charid] = { counter: 0, charname: charname }; }
        this.popularContentCharacters[charid].counter++;
        this.popularContentCharacters[charid].updated = new Date().getTime();
    };

    /**
     *
     *
     *
     */
    contentService.updateCachedCharacters = function (responseObjectItemList) {
        if (responseObjectItemList.length === 0) { return false; }
        responseObjectItemList.forEach(function (objectItem, index) {
            contentService.cachedCharacters[objectItem.name] = {
                id: objectItem.id,
                updated: new Date().getTime()
            }
        });
        contentService.setCache('cachedCharacters', contentService.cachedCharacters);
    };

    /**
     * popularContentItems
     * @param itemid number
     */
    contentService.updatePopularItem = function (itemid, itemname) {
        if (!this.popularContentItems[itemid]) { this.popularContentItems[itemid] = { counter: 0, itemname: itemname }; }
        this.popularContentItems[itemid].counter++;
        this.popularContentItems[itemid].updated = new Date().getTime();
    };

    /**
     *
     * @returns {popularContentCharacters}
     */
    contentService.getPopularCharacters = function () {
        return this.popularContentCharacters;
    };

    /**
     *
     * @returns {popularContentItems}
     */
    contentService.getPopularItems = function () {
        return this.popularContentItems;
    };

    /**
     *
     *
     */
    contentService.getAuctionItems = function () {
        return new promise(function (resolve, reject){

            dataContent.query('select ib.*, ia.level, ia.ilevel, ia.jobs, ia.slot from item_basic ib left join item_armor ia on ib.itemid = ia.itemid where ib.aH <> 0 and NoSale = 0 order by aH;')
                .then(function (results) {
                    resolve(dataContent.parseDataRows(results));
                })
                .catch(function(err){
                    reject(err);
                })

        });
    }

    /**
     * searchCharByName
     * @param charname string
     */
    contentService.searchCharByName = function (charname) {

        var options = {
            method: this.contentEndpoints.searchCharByName.method,
            url: this.contentEndpoints.searchCharByName.url,
            time: true,
            timeout: contentService.requestTimeout,
            headers:
                { 'Cache-Control': 'no-cache', 'Content-Type': 'application/x-www-form-urlencoded' },
            form: { charname: charname }
        };

        return new promise(function (resolve, reject) {
            var cacheId = md5('searchCharByName' + charname);
            var cachedObject = contentService.getCache(cacheId);
            if (cachedObject === false) {
                contentService.setCache(cacheId, [], 3600);
                resolve(postDataReturned);
            } else {
                resolve(cachedObject);
            }
        });

    };

    /**
     * searchChar
     * @param charid number
     */
    contentService.searchChar = function (charid) {

        var options = {
            method: this.contentEndpoints.searchChar.method,
            url: this.contentEndpoints.searchChar.url,
            time: true,
            timeout: contentService.requestTimeout,
            headers:
                { 'Cache-Control': 'no-cache', 'Content-Type': 'application/x-www-form-urlencoded' },
            form: { charid: charid }
        };

        return new promise(function (resolve, reject) {
            var cacheId = md5('searchChar' + charid);
            var cachedObject = contentService.getCache(cacheId);
            var postDataReturned = {
                sale_list: []
            };
            if (cachedObject === false) {
                dataContent.query('select ah.*, ib.name as item_name, ib.aH from auction_house ah join item_basic ib on ah.itemid = ib.itemid where ah.sell_date <> 0 and ah.seller = ' + parseInt(charid) + ' limit 50;')
                    .then(function (result) {
                        postDataReturned = {
                            sale_list: result
                        };
                        contentService.setCache(cacheId, postDataReturned, 3600);
                        resolve(postDataReturned);
                    })
                    .catch(function (err) {
                        resolve(postDataReturned);
                    });
            } else {
                var postDataReturned = cachedObject;
                if (postDataReturned && postDataReturned.length > 0) { contentService.updatePopularCharacter(charid, postDataReturned[0].name); }
                resolve(cachedObject);
            }
        });

    };

    /**
     *
     * @param itemname string
     */
    contentService.searchItemByName = function (itemname) {

        var options = {
            method: this.contentEndpoints.searchItemByName.method,
            url: this.contentEndpoints.searchItemByName.url,
            time: true,
            timeout: contentService.requestTimeout,
            headers:
                { 'Cache-Control': 'no-cache', 'Content-Type': 'application/x-www-form-urlencoded' },
            form: { itemname: itemname }
        };

        return new promise(function (resolve, reject) {
            var cacheId = md5('searchItemByName' + itemname);
            var cachedObject = contentService.getCache(cacheId);
            if (cachedObject === false) {
                contentService.setCache(cacheId, [], 3600);
                resolve(postDataReturned);
            } else {
                resolve(cachedObject);
            }
        });

    };

    /**
     *
     * @param itemid number
     */
    contentService.searchItem = function (itemid, stack) {

        var options = {
            method: this.contentEndpoints.searchItem.method,
            url: this.contentEndpoints.searchItem.url,
            time: true,
            timeout: contentService.requestTimeout,
            headers:
                { 'Cache-Control': 'no-cache', 'Content-Type': 'application/x-www-form-urlencoded' },
            form: { itemid: itemid, stack: stack }
        };

        return new promise(function (resolve, reject) {
            var cacheId = md5('searchItem' + itemid + stack);
            var cachedObject = contentService.getCache(cacheId);
            var cachedItemData;
            var postDataReturned = {
                sale_list: []
            };

            if (cachedObject === false) {

                dataContent.query('select ib.*, ia.level, ia.ilevel, ia.jobs, ia.slot from item_basic ib left join item_armor ia on ib.itemid = ia.itemid where ib.itemid = ' + parseInt(itemid) + ';')
                    .then(function (result) {
                        postDataReturned['item_data'] = {
                            itemid: result[0].itemid,
                            subid: result[0].subid,
                            name: result[0].name,
                            sortname: result[0].sortname,
                            stackSize: result[0].stackSize,
                            flags: result[0].flags,
                            aH: result[0].aH,
                            NoSale: result[0].NoSale,
                            BaseSell: result[0].BaseSell,
                            level: result[0].level,
                            ilevel: result[0].ilevel,
                            jobs: result[0].jobs,
                            slot: result[0].slot,
                        };
                        return true;
                    })
                    .then(function () {
                        return dataContent.query('select count(id) as items_on_sale from auction_house where sell_date = 0 and itemid = ' + parseInt(itemid) + ';');
                    })
                    .then(function (result) {
                        postDataReturned['items_on_sale'] = result[0].items_on_sale;
                        return dataContent.query('select ah.*, ib.name as item_name, ib.aH from auction_house ah join item_basic ib on ah.itemid = ib.itemid where ah.sell_date <> 0 and ah.itemid = ' + parseInt(itemid) + ' limit 50;');
                    })
                    .then(function (result) {
                        // postDataReturned['sale_list'] = result;
                        // debug(result.length);
                        for (var i = 0; i < result.length; i++) {
                            // debug(result[i]);
                            var saleItem = {};
                            Object.keys(result[i]).forEach(function (key) {
                                saleItem[key] = result[i][key];
                            });
                            postDataReturned['sale_list'].push(saleItem);
                        }
                        contentService.setCache(cacheId, postDataReturned, 3600);
                        resolve(postDataReturned);
                    })
                    .catch(function (err) {
                        debug(err);
                        resolve(postDataReturned);
                    });

            } else {
                // contentService.updatePopularItem(itemid, cachedObject.sale_list[0].item_name);
                resolve(cachedObject);
            }
        });

    };

    /**
     * getCache
     * @param cacheId
     * @returns {(boolean|object)}
     */
    contentService.getCache = function (cacheId) {
        var cachedObject = this.cachedContent[cacheId];
        if (!cachedObject) {
            cachedObject = { data: false };
        } else {
            if (cachedObject.expires < new Date().getTime()) {
                cachedObject = { data: false };
                delete this.cachedContent[cacheId];
            }
        }
        return cachedObject.data;
    };

    /**
     * setCache
     * @param cacheId string
     * @param blob object
     * @param ttl number
     * @returns {boolean}
     */
    contentService.setCache = function (cacheId, blob, ttl) {
        this.cacheQueue.push(cacheId);
        this.cachedContent[cacheId] = {
            expires: new Date().getTime() + ((ttl ? ttl : 300) * 1000),
            data: blob
        };
        return true;
    };

    contentService.cacheStorage = function () {
        var cacheId = contentService.cacheQueue.shift(),
            cacheObject = {};

        if (cacheId) {
            cacheObject = contentService.getCache(cacheId);
            if (cacheObject) {
                fs.writeFile(__dirname + '/dat/' + cacheId + '.dat', JSON.stringify(cacheObject), 'utf8', function (err) {
                    if (err) {

                    } else {

                    }
                });
            }
        }

    };

    return contentService;
};
