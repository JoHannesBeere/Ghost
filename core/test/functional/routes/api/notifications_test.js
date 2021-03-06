/*global describe, it, before, after */
/*jshint expr:true*/
var testUtils     = require('../../../utils'),
    supertest     = require('supertest'),
    express       = require('express'),
    should        = require('should'),

    ghost         = require('../../../../../core'),

    httpServer,
    request;

describe('Notifications API', function () {
    var accesstoken = '';

    before(function (done) {
        var app = express();

        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost({app: app}).then(function (_httpServer) {
            httpServer = _httpServer;
            request = supertest.agent(app);

        }).then(function () {
            return testUtils.doAuth(request);
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function () {
        httpServer.close();
    });

    describe('Add', function () {
        var newNotification = {
            type: 'info',
            message: 'test notification'
        };

        it('creates a new notification', function (done) {
            request.post(testUtils.API.getApiQuery('notifications/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send({ notifications: [newNotification] })
                .expect('Content-Type', /json/)
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;

                    jsonResponse.notifications.should.exist;

                    testUtils.API.checkResponse(jsonResponse.notifications[0], 'notification');

                    jsonResponse.notifications[0].type.should.equal(newNotification.type);
                    jsonResponse.notifications[0].message.should.equal(newNotification.message);
                    jsonResponse.notifications[0].status.should.equal('persistent');

                    done();
                });
        });
    });

    describe('Delete', function () {
        var newNotification = {
            type: 'info',
            message: 'test notification',
            status: 'persistent'
        };

        it('deletes a notification', function (done) {
            // create the notification that is to be deleted
            request.post(testUtils.API.getApiQuery('notifications/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send({ notifications: [newNotification] })
                .expect('Content-Type', /json/)
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var location = res.headers['location'];

                    var jsonResponse = res.body;

                    jsonResponse.notifications.should.exist;
                    testUtils.API.checkResponse(jsonResponse.notifications[0], 'notification');

                    jsonResponse.notifications[0].type.should.equal(newNotification.type);
                    jsonResponse.notifications[0].message.should.equal(newNotification.message);
                    jsonResponse.notifications[0].status.should.equal(newNotification.status);

                    // begin delete test
                    request.del(location)
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            // a delete returns a JSON object containing the notification
                            // we just deleted.
                            var deleteResponse = res.body;
                            deleteResponse.notifications.should.exist;
                            deleteResponse.notifications[0].type.should.equal(newNotification.type);
                            deleteResponse.notifications[0].message.should.equal(newNotification.message);
                            deleteResponse.notifications[0].status.should.equal(newNotification.status);

                            done();
                        });
                });
        });
    });
});
