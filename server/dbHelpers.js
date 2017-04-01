const mysql = require('mysql');
const mysqlConfig = require('./db-mysql/config.js');
const db = mysql.createPool(mysqlConfig);
const Promise = require('bluebird');

Promise.promisifyAll(db);

const queryString = {

  createNewUser: 'INSERT INTO\
                    members (name)\
                    VALUES (?)',

  createNewTrip: 'INSERT INTO trips (name, adminID)\
                    VALUES (?, (SELECT members.id FROM members\
                    WHERE members.name = ?));\
                  INSERT INTO trips_members (tripID, memberID)\
                    VALUES (LAST_INSERT_ID(),\
                           (SELECT trips.adminID FROM trips\
                           WHERE trips.id = LAST_INSERT_ID()));',

  addMembersToTrip: 'INSERT INTO trips_members (tripID, memberID)\
                      VALUES ((SELECT trips.id FROM trips\
                      WHERE trips.name = ? AND\
                            trips.adminID = (SELECT members.id FROM members \
                              WHERE members.name = ?)),\
                              (SELECT members.id FROM members\
                              WHERE members.name = ?));',

  addReceipt: 'INSERT INTO receipts (payorID, tripID, name, url, \
                sum_bill, sum_tax, sum_tip) \
                  VALUES ((SELECT members.id FROM members \
                  WHERE members.name = ?), \
                          (SELECT trips.id FROM trips \
                          WHERE trips.name = ? \
                          AND trips.adminID = (SELECT members.id FROM members \
                          WHERE members.name = ?)), \
                          ?, ?, ?, ?, ?);',
  storeReceiptItems: 'INSERT INTO items (receiptID, tripID, name, raw_price, comment) \
                        VALUES ((SELECT receipts.id from receipts \
                        WHERE receipts.url = ?), \
                                (SELECT receipts.tripID from receipts \
                                WHERE receipts.url = ?), \
                                ?, ?, ?);',
  assignItemsToMembers: 'INSERT INTO consumed_items (itemID, payorID, payeeID, \
                          receiptID, tripID) \
                            VALUES ((SELECT items.id FROM items \
                            WHERE items.name = ? \
                            AND items.receiptID = \
                              (SELECT receipts.id FROM receipts \
                              WHERE receipts.url = ?)), \
                              (SELECT members.id FROM members \
                              WHERE members.name = ?), \
                              (SELECT members.id FROM members \
                              WHERE members.name = ?), \
                              (SELECT receipts.id FROM receipts \
                              WHERE receipts.url = ?), \
                              (SELECT trips.id FROM trips \
                              WHERE trips.adminID = \
                              (SELECT members.id from members \
                              WHERE members.name = ?)\
                              AND trips.name = ?));',
  addFriend: 'INSERT INTO friendsList (member_id, friend_id)\
                VALUES ((SELECT id FROM members WHERE email = ?),\
                        (SELECT id FROM members WHERE email = ?));',
  findFriend: 'SELECT * FROM friendsList\
                where member_id=(SELECT id FROM members WHERE email = ?)\
                       AND friend_id=(SELECT id FROM members WHERE email = ?);',
  getAllFriends: 'SELECT members.name, members.email FROM members\
                  WHERE members.id IN\
                  (SELECT friendsList.friend_id FROM friendsList\
                  WHERE friendsList.member_id=\
                  (SELECT id FROM members WHERE email = ?))',
  removeFriend: 'DELETE FROM friendsList WHERE\
                  member_id=(SELECT id FROM members WHERE email = ?)\
                  AND friend_id=(SELECT id FROM members WHERE email = ?)'
}

const removeFriend = (params, cb) => {
  db.query(queryString.removeFriend, params, (err, result) => {
    if (err) {
      // console.log('Error removing friends...');
      cb(err, null);
    } else {
      // console.log('Success removing friends!');
      cb(null, result);
    }
  });
};

const getAllFriends = (params, cb) => {
  db.query(queryString.getAllFriends, params, (err, result) => {
    if (err) {
      // console.log('Error getting all friends...');
      cb(err, null);
    } else {
      // console.log('Success getting all friends!');
      cb(null, result);
    }
  });
};

const addFriend = (params, cb) => {
  db.query(queryString.findFriend, params, (err, result) => {
    if (err) {
      // console.log('ERROR IN FIND FRIEND');
      cb('There seems to be an error. Try again later.', null);
    } else if (result.length < 1) {
      db.query(queryString.addFriend, params, (err) => {
        if (err) {
          // console.log('ERROR IN ADD FRIEND')
          cb('Sorry we could not find your friend...', null)
        } else {
          // console.log('success!! add friend');
          cb(null, 'Successfully added friend!');
        }
      });
    } else {
      // console.log('DUPLICATE FRIEND');
      cb(null, 'You are already friends with this user!')
    }
  });
};

const createNewUser = (userInfo) => {
  db.queryAsync(`SELECT * from members where fb_id = ?`, userInfo.fb_id)
    .then( user => {
      console.log('successful checked user');
      if(!user[0]) {
        db.queryAsync(`INSERT INTO members set ?`, userInfo)
      } else {
        console.log('user already exisit');
      }
    })
    .catch(err => console.error(err));
}

const createNewTrip = (params) => {
  // console.log('createNewTrip!!!! params!!!!', params);
  // Total 2 fields: get name and ADMIN_NAME from req.body
  const queryCheckIfTripExist = `SELECT trips.id FROM trips WHERE trips.name = ? AND trips.adminID = (SELECT members.id FROM members
                    WHERE members.name = ?)`
  const queryStringCreateNewTrip = `INSERT INTO trips (name, adminID)
                    VALUES (?, (SELECT members.id FROM members
                    WHERE members.name = ?));`
  const queryStringInsertTripMembers = `INSERT INTO trips_members (tripID, memberID)
                    VALUES ( (SELECT trips.id FROM trips WHERE trips.name = ?),
                    (SELECT trips.adminID FROM trips
                    WHERE trips.id = (SELECT trips.id FROM trips WHERE trips.name = ?)));`
  return db.queryAsync(queryCheckIfTripExist, params)
    .then( result => {
      if (result[0]) {
        throw 'Trip already exist!';
      }
    })
    .then( () => db.queryAsync(queryStringCreateNewTrip, params))
    .then( () => db.queryAsync(queryStringInsertTripMembers, [params[0], params[0]]))
    .catch( err => console.error('ERROR: createNewTrip in SQL', err) );
}

const addMembersToTrip = (params) => {
  // Total 3 fields: get TRIP_NAME, ADMIN_NAME and [MEMBER_ARRAY] from req.body
  let tripName = params.tripName;
  let adminName = params.adminName;
  let membersArray = params.noDupeMemberArray;

  // console.log('addMembersToTrip!!!!!!! PARAMS!!!', params);

  const queryMemberId = `SELECT members.id FROM members WHERE members.name = ?`;
  const addMembersToTrip = `INSERT INTO trips_members (tripID, memberID) VALUES ((SELECT trips.id FROM trips
                      WHERE trips.name = ?), ?)`;

  return Promise.map(membersArray, (member) => {
    return db.queryAsync(queryMemberId, member)
      .then(result => {
        if (result[0]) {
          // console.log('member already exisit and id is=============', result[0].id);
          return db.queryAsync(addMembersToTrip, [tripName, result[0].id ])
        } else {
          return db.queryAsync(queryString.createNewUser, member)
          .then( () => {
              db.queryAsync(queryMemberId, member)
              .then( (memberId) => db.queryAsync(addMembersToTrip, [tripName, memberId[0].id]))
            }
          )
        }
    })
    .then( () => console.log('SUCCESS: new member has been added to the trip.'))
    .catch(err => console.error('ERROR: addMemberToTrip in SQL', err));
  })
}

const addReceipt = (params) => {
  // Total 8 fields: get PAYOR_AUTH, TRIP_NAME, PAYOR_AUTH, RECEIPT_NAME, RECEIPT_URL, TOTAL_BILL, TOTAL_TAX, TOTAL_TAX_TIP from req.body
  // console.log('addReceipt PARAMSSS!!!!', params);
  return db.queryAsync(queryString.addReceipt, params)
    .then( (result) => console.log('successful insert into addReceipt'))
    .catch( err => console.error('SQL ERROR in addReceipt', err));
}

const storeReceiptItems = ({receiptUrl, allItemsArray, allPricesArray}) => {
  // Total 4 fields from req.headers: get RECEIPT_URL, RECEIPT_URL, [ITEM NAMES], RAW_PX
  return Promise.map(allItemsArray, (item, index) => {
    return  db.queryAsync(queryString.storeReceiptItems, [receiptUrl, receiptUrl, item, allPricesArray[index], 'N/A' ])
      .then( () => console.log('SUCCESS: insert storeReceiptItems'))
      .catch(err => console.error('SQL ERROR in storeReceiptItems', err));
  })
}

const assignItemsToMembers = (allItemsArray, params) => {
  // console.log('assignItemsToMembers------', JSON.stringify(params));

  let allConsumers = [];
  let allItems = [];

  for (let i = 0; i < allItemsArray.length; i++) {
    for (let k = 0; k < params.items[i][0].members.length; k++) {

      while (k !== params.items[i][0].members.length) {
        allConsumers.push(params.items[i][0].members[k]);
        allItems.push(params.items[i][0].name);
        k++;
      }
    }
  }
    for (let i = 0; i < allItems.length; i++) {
      db.query(queryString.assignItemsToMembers, [
          allItems[i],
          params.receiptUrl,
          params.username,
          allConsumers[i],
          params.receiptUrl,
          params.username,
          params.tripName
        ], (err, results) => {
          if (err) {
            console.log(err);
          }
        }
      )
    }
}

const createMemberSummary = (params) => {
  // console.log('----params passed down to Server here!!!!------', params);
  let tripName = params.tripName;
  // NEED: fb_id, name, email, token
  let adminName = params.username;
  let payor = params.username;
  let receiptName = params.receiptName;
  params.receiptUrl = params.receiptUrl || receiptName + Math.floor(Math.random(0, 1) * 10000000);
  let receiptUrl = params.receiptUrl;
  let sumBill = Number(params.sumBill) || 0;
  let sumTax = Number(params.sumTax) || 0;
  let sumTip = Number(params.sumTip) || 0;
  let memberArrayWithDupes = [].concat.apply([], params.members);
  let noDupeMemberArray = [].concat.apply([], params.members);
  noDupeMemberArray.shift();
  let allItemsArray = [];
  for (let i = 0; i < params.items.length; i++) {
    allItemsArray.push(params.items[i][0].name);
  }

  let allPricesArray = [];
  for (let i = 0; i < params.items.length; i++) {
    allPricesArray.push(params.items[i][0].amount);
  }

  createNewTrip([tripName, adminName])
  .then( () => {
    return addMembersToTrip({
      tripName: tripName,
      adminName: adminName,
      noDupeMemberArray: noDupeMemberArray
    })
    .then( () => {
      return addReceipt([payor, tripName, adminName, receiptName, receiptUrl, sumBill, sumTax, sumTip]);
    })
    .then( () => {
      return storeReceiptItems({
        receiptUrl: receiptUrl,
        allItemsArray: allItemsArray,
        allPricesArray: allPricesArray
      });
    })
    .then ( () => {
      return assignItemsToMembers(allItemsArray, params);
    })
  })
  .catch( err => console.error('ERROR: createMemberSummary', err));
}


const getReceiptsAndTrips = (params, cb) => {
  let database = mysqlConfig.database;
  if (database = 'gewd') {
    database = '';
  } else if (database = 'heroku_a258462d4ded143') {
    database = 'heroku_a258462d4ded143' + '.';
  }

  // const queryStringGetMemberIDFromTripID = `SELECT trips_members.memberID from heroku_a258462d4ded143.trips_members WHERE trips_members.tripID = ?;`
  // const queryStringGetMemberNameFromMemberID = `SELECT members.name FROM heroku_a258462d4ded143.members WHERE members.id = ?;`

  // const queryStringGetReceiptNamesFromPayorIDAndTripID = `SELECT receipts.name FROM heroku_a258462d4ded143.receipts WHERE receipts.payorID = ? AND receipts.tripID = ?;`

  // const queryStringGetSumBillFromReceiptName = `SELECT receipts.sum_bill FROM receipts WHERE receipts.name = ?;`
  // const queryStringGetSumTaxFromReceiptName = `SELECT receipts.sum_tax FROM receipts WHERE receipts.name = ?;`
  // const queryStringGetSumTipFromReceiptName = `SELECT receipts.sum_tip FROM receipts WHERE receipts.name = ?;`

  // const queryMembersFromTripsName = select * from trips_members, members where trips_members.tripID = (select id from trips where trips.name = '?') and memberID=members.id;

  // const queryStringGetAdminIdByEmail = 'select id from users where email = ?';
  // let adminName = params.adminName;
  // let tripName = params.tripName;
  const queryStringGetReceiptInfoFromAdminName = 'select trips.name, receipts.sum_bill, receipts.sum_tax, receipts.sum_tip from trips, receipts where trips.adminID = (select members.id from members where members.email = ?) and trips.id = receipts.tripID';
  const queryStringGetTripsSummary = 'select receipts.id, trips.id, trips.name, receipts.sum_bill, receipts.sum_tax, receipts.sum_tip, GROUP_CONCAT(distinct members.name), items.receiptID, group_concat(items.name), group_concat(items.raw_price), group_concat(members.name) from trips, receipts, trips_members, items, consumed_items, members where (select id from members where members.email=?) and (receipts.tripID = trips.id) and trips_members.tripID = trips.id and items.id=consumed_items.itemID and receipts.id=items.receiptID and members.id=consumed_items.payeeID group by receipts.id, items.receiptID;'
  // db.query(queryStringGetReceiptInfoFromAdminName, params, (err, result) => {
  //   if (err) {
  //     cb(err, null);
  //   } else {
  //     console.log(result);
  //     db.query(queryStringTest, params, (err, result) => {
  //       console.log('TEST', result);

  //     });
  //     cb(null, result);

  //   }
  // });
  db.query(queryStringGetTripsSummary, params, (err, result) => {
    if (err) {
      cb(err, null);
    } else {
      // "7,1,2"
      // group_concat(items.name)
      // :
      // "1 Chicken Wings,2 Uni pasta,1 Truffle Fries,1 Chicken Wings,2 Uni pasta,2 Uni pasta,2 Uni pasta,1 Chicken Wings,1 HH- Saporo,1 Chicken Wings,2 Uni pasta,2 Uni pasta,20 HH OYSTER,1 Chicken Wings,1 HH- Saporo,1 Chicken Wings,2 Uni pasta,20 HH OYSTER,20 HH OYSTER,1 Chicken Wings,1 Chicken Wings,1 HH- Saporo,1 HH-Goose Island,20 HH OYSTER,1 Chicken Wings,20 HH OYSTER,1 Truffle Fries,1 HH- Saporo,1 HH-Goose Island,20 HH OYSTER,2 Uni pasta,20 HH OYSTER,1 HH- Saporo,1 Truffle Fries,1 HH-Goose Island,2 Uni pasta,20 HH OYSTER,20 HH OYSTER,2 Uni pasta,1 Truffle Fries,2 Uni pasta,1 HH-Goose Island,20 HH OYSTER,2 Uni pasta,2 Uni pasta,1 Chicken Wings,1 Truffle Fries,1 HH-Goose Island,2 Uni pasta,2 Uni pasta"
      // group_concat(items.raw_price)
      // :
      // "10,42,6,10,42,42,42,10,5,10,42,42,20,10,5,10,42,20,20,10,10,5,5,20,10,20,6,5,5,20,42,20,5,6,5,42,20,20,42,6,42,5,20,42,42,10,6,5,42,42"
      // group_concat(members.name)
      // :
      // "Brandon Wong,Tayo,Kai,Tayo,Brandon Wong,Kai,Tayo,Brandon Wong,Brandon Wong,Tayo,Brandon Wong,Kai,Tayo,Brandon Wong,Brandon Wong,Tayo,Brandon Wong,Kai,Tayo,Brandon Wong,Tayo,Brandon Wong,Kai,Kai,Brandon Wong,Tayo,Kai,Brandon Wong,Kai,Kai,Tayo,Tayo,Brandon Wong,Kai,Kai,Kai,Kai,Tayo,Tayo,Kai,Brandon Wong,Kai,Kai,Kai,Tayo,Tayo,Kai,Kai,Brandon Wong,Kai"
      var summaryPacket = [];
      console.log(result);
      console.log(result[0] ? result[0]['group_concat(items.name)'].split(',').length : null);
      console.log(result[0] ? result[0]['group_concat(items.raw_price)'].split(',').length : null);
      console.log(result[0] ? result[0]['group_concat(members.name)'].split(',').length : null);
      if (result[0]) {
        for (let summary = 0; summary < result.length; summary++) {
          console.log('SUMMARY', summary);
          var packet = {
            'name': result[summary]['name'],
            'sumBill': result[summary]['sum_bill'],
            'sumTax': result[summary]['sum_tax'],
            'sumTip': result[summary]['sum_tip'],
            'members': result[summary]['GROUP_CONCAT(distinct members.name)'].split(',')
          };
          let items = [];
          let local = {};
          const itemNames = result[summary]['group_concat(items.name)'].split(',');
          const itemPrices = result[summary]['group_concat(items.raw_price)'].split(',');
          const itemMembers = result[summary]['group_concat(members.name)'].split(',');
          for (let item = 0; item < itemNames.length; item++) {
            if (!local[itemNames[item]]) {
              local[itemNames[item]] = {'found': true};
              local[itemNames[item]] = {
                'package': {
                  'name': itemNames[item]
                }
              };
              // local[itemNames[item]]['package']['amount'] = itemPrices[item];
              local[itemNames[item]]['package']['amount'] = itemPrices[item];
            }
            if (!local[itemNames[item]]['members']) {
              // local[itemNames[item]]['member'][itemMembers[item]] = true;
              local[itemNames[item]]['members'] = {};
              local[itemNames[item]]['members'][itemMembers[item]] = true;

              local[itemNames[item]]['package']['members'] = [itemMembers[item]];
            } else if (!local[itemNames[item]]['members'][itemMembers[item]]) {
              console.log('PUSHING MEMBER ================', itemMembers[item]);
              local[itemNames[item]]['members'][itemMembers[item]] = true;
              local[itemNames[item]]['package']['members'].push(itemMembers[item]);
            }
          }
          console.log('LOCAL STORAGE', local);
          for (var element in local) {
            items.push([local[element]['package']]);
          }
          console.log('ITEMS', items);
          packet['items'] = items;
          summaryPacket.push(packet);
          // summaryPacket[summary]['name'] = result[summary]['name'];
        }
        cb(null, summaryPacket);

      }
    }
  });



  // return db.queryAsync(queryStringGetAllTripsFromAdminName, adminName)
  //   .then( tripsArray => tripsArray )
  //   // .then( tripsArray => {
  //   //   return Promise.map( tripsArray, trip => {
  //   //     return db.queryAsync(queryStringGetTripIDFromTripName, trip.name)
  //   //       .then( tripID => tripID )
  //   //   })
  //   // })
  //   .catch( err => console.log('ERROR: getAllTripsFromAdminName', err ));
};

module.exports = {
  createNewUser,
  createNewTrip,
  addMembersToTrip,
  addReceipt,
  storeReceiptItems,
  assignItemsToMembers,
  createMemberSummary,
  getReceiptsAndTrips,
  addFriend,
  getAllFriends,
  removeFriend
}
