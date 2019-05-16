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

var ContentService = {

    requestTimeout: 4000,
    cacheQueueInterval: 10,
    cacheQueue: [],
    cachedContent: {},
    cachedCharacters: {},
    popularContentCharacters: {},
    popularContentItems: {},

    databaseAuctionItems: [],

    /**
     *
     */
    refreshAuctionItems: function () {
        ContentService.getAuctionItems()
            .then(function (results) {
                debug('refreshAuctionItems::completed!');
                ContentService.databaseAuctionItems = results;
                setTimeout(function () {
                    ContentService.refreshAuctionItems();
                }, 300000);
            })
            .catch(function (err) {
                setTimeout(function () {
                    ContentService.refreshAuctionItems();
                }, 300000);
            });
    },

    /**
     * fetchAuctionItemById
     * @param itemid number
     */
    fetchAuctionItemById: function (itemid) {
        let auctionItemData = false;
        ContentService.databaseAuctionItems.forEach(auctionItem => {
            if (auctionItem.itemid === itemid) {
                auctionItemData = auctionItem;
            }
        });
        return auctionItemData;
    },

    /**
     * updatePopularCharacter
     * @param charid number
     * @param charname string
     */
    updatePopularCharacter: function (charid, charname) {
        if (!this.popularContentCharacters[charid]) { this.popularContentCharacters[charid] = { counter: 0, charname: charname }; }
        this.popularContentCharacters[charid].counter++;
        this.popularContentCharacters[charid].updated = new Date().getTime();
    },

    /**
     * updateCachedCharacters
     * @param responseObjectItemList array
     * @returns null
     */
    updateCachedCharacters: function (responseObjectItemList) {
        if (responseObjectItemList.length === 0) { return false; }
        responseObjectItemList.forEach(function (objectItem, index) {
            ContentService.cachedCharacters[objectItem.name] = {
                id: objectItem.id,
                updated: new Date().getTime()
            }
        });
        ContentService.setCache('cachedCharacters', ContentService.cachedCharacters);
    },

    /**
     * popularContentItems
     * @param itemid number
     * @param itemname string
     * @returns null
     */
    updatePopularItem: function (itemid, itemname) {
        if (!this.popularContentItems[itemid]) { this.popularContentItems[itemid] = { counter: 0, itemname: itemname }; }
        this.popularContentItems[itemid].counter++;
        this.popularContentItems[itemid].updated = new Date().getTime();
    },

    /**
     * getPopularCharacters
     * @returns {popularContentCharacters}
     */
    getPopularCharacters: function () {
        return this.popularContentCharacters;
    },

    /**
     * getPopularItems
     * @returns {popularContentItems}
     */
    getPopularItems: function () {
        return this.popularContentItems;
    },

    /**
     * getAuctionItems
     * @returns {promise}
     */
    getAuctionItems: function () {
        return new promise(function (resolve, reject) {

            dataContent.query('select ib.*, ia.level, ia.ilevel, ia.jobs, ia.slot, (select count(id) from auction_house where sell_date = 0 and itemid = ib.itemid) as sell_count from item_basic ib left join item_armor ia on ib.itemid = ia.itemid where ib.aH <> 0 and NoSale = 0 order by aH;')
                .then(function (results) {
                    resolve(dataContent.parseDataRows(results));
                })
                .catch(function (err) {
                    reject(err);
                })

        });
    },

    /**
     * searchCharByName
     * @param charname string
     */
    searchCharByName: function (charname) {
        return new promise(function (resolve, reject) {
            var cacheId = md5('searchCharByName' + charname);
            var cachedObject = ContentService.getCache(cacheId);
            if (cachedObject === false) {
                ContentService.setCache(cacheId, [], 3600);
                resolve(postDataReturned);
            } else {
                resolve(cachedObject);
            }
        });
    },

    /**
     * searchChar
     * @param charid number
     */
    searchChar: function (charid) {
        return new promise(function (resolve, reject) {
            var cacheId = md5('searchChar' + charid);
            var cachedObject = ContentService.getCache(cacheId);
            var postDataReturned = {
                sale_list: []
            };
            if (cachedObject === false) {
                dataContent.query('select ah.*, ib.name as item_name, ib.aH from auction_house ah join item_basic ib on ah.itemid = ib.itemid where ah.sell_date <> 0 and ah.seller = ' + parseInt(charid) + ' limit 50;')
                    .then(function (result) {
                        postDataReturned = {
                            sale_list: result
                        };
                        ContentService.setCache(cacheId, postDataReturned, 3600);
                        resolve(postDataReturned);
                    })
                    .catch(function (err) {
                        resolve(postDataReturned);
                    });
            } else {
                var postDataReturned = cachedObject;
                if (postDataReturned && postDataReturned.length > 0) { ContentService.updatePopularCharacter(charid, postDataReturned[0].name); }
                resolve(cachedObject);
            }
        });
    },

    /**
     * searchItemByName
     * @param itemname string
     */
    searchItemByName: function (itemname) {
        return new promise(function (resolve, reject) {
            var cacheId = md5('searchItemByName' + itemname);
            var cachedObject = ContentService.getCache(cacheId);
            if (cachedObject === false) {
                ContentService.setCache(cacheId, [], 3600);
                resolve(postDataReturned);
            } else {
                resolve(cachedObject);
            }
        });
    },

    /**
     * searchItem
     * @param itemid number
     */
    searchItem: function (itemid, stack) {
        return new promise(function (resolve, reject) {
            var cacheId = md5('searchItem' + itemid + stack);
            var cachedObject = ContentService.getCache(cacheId);
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
                        ContentService.setCache(cacheId, postDataReturned, 3600);
                        resolve(postDataReturned);
                    })
                    .catch(function (err) {
                        debug(err);
                        resolve(postDataReturned);
                    });

            } else {
                // ContentService.updatePopularItem(itemid, cachedObject.sale_list[0].item_name);
                resolve(cachedObject);
            }
        });
    },

    /**
     * getCache
     * @param cacheId
     * @returns {(boolean|object)}
     */
    getCache: function (cacheId) {
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
    },

    /**
     * setCache
     * @param cacheId string
     * @param blob object
     * @param ttl number
     * @returns {boolean}
     */
    setCache: function (cacheId, blob, ttl) {
        this.cacheQueue.push(cacheId);
        this.cachedContent[cacheId] = {
            expires: new Date().getTime() + ((ttl ? ttl : 300) * 1000),
            data: blob
        };
        return true;
    },

    cacheStorage: function () {
        var cacheId = ContentService.cacheQueue.shift(),
            cacheObject = {};

        if (cacheId) {
            cacheObject = ContentService.getCache(cacheId);
            if (cacheObject) {
                fs.writeFile(__dirname + '/dat/' + cacheId + '.dat', JSON.stringify(cacheObject), 'utf8', function (err) {
                    if (err) {

                    } else {

                    }
                });
            }
        }
    }

};

setInterval(function () {
    ContentService.cacheStorage();
}, 1000 * ContentService.cacheQueueInterval);

/**
 * Fetch auction items, sell count. Also starts refresh loop
 */
ContentService.refreshAuctionItems();

var exports = module.exports = {
    getAuctionItems: ContentService.getAuctionItems,
    fetchAuctionItemById: ContentService.fetchAuctionItemById,
    searchCharByName: ContentService.searchCharByName,
    searchChar: ContentService.searchChar,
    searchItemByName: ContentService.searchItemByName,
    searchItem: ContentService.searchItem
};
