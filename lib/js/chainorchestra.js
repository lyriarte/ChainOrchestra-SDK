/******************************************************************************
 * Copyright 2016 ChainOrchestra.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *****************************************************************************/





/******************************************************************************
 * Platform abstraction section. This allows the chainorchestra.js library 
 * to be used as-is in a web browser, or as a node.js module.
 *
 *****************************************************************************/
 
/**
 * The platformAbstract object manages components that differ between
 * node.js and in-browser environment. 
 */ 
var platformAbstract = {
	XMLHttpRequest: null,
	exports: null
};

if (typeof XMLHttpRequest === "undefined") {
	platformAbstract.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
}
else {
	platformAbstract.XMLHttpRequest = XMLHttpRequest;
}

if (typeof exports === "undefined") {
	platformAbstract.exports = {};
}
else {
	platformAbstract.exports = exports;
}





/******************************************************************************
 * 
 * ChainOrchestra simplified Hyperledger REST client API.
 * 
 * The chainorchestra.js API defines a basic set of objects to handle
 * Hyperledger peer interactions over the REST API.
 * 
 *****************************************************************************/


/***
 * xmlhttpRequestChange onreadystatechange callback common to all Hyperledger
 * peer REST calls made by the ChainOrchestra peer proxy.
 */
var xmlhttpRequestChange = function() {
	if (this.readyState != 4)
		return;
	var objres = {};
	try {
		objres = JSON.parse(this.responseText);
	}
	catch (e) {
		objres.text = this.responseText;
	}
	if (this.status === 200) {
		if (this.async.onOk)
			this.async.onOk(objres);
	}
	else {
		if (this.async.onError)
			this.async.onError(objres);
	}
};



/**
 * The PeerProxy object manages all asynchronous calls to a Hyperledger peer.
 * It is the base class for other objects specialized in user connection, 
 * queries, transactions and chaincode deployment.
 * 
 * @constructor
 * @param ip {string} - The peer ip address.
 * @param port {string} - The peer REST interface port.
 * @param rpcObj {object} - Optional object holding additional JSON RPC parameters.
 */
var PeerProxy = function(ip, port, rpcObj) {
	this.ip = ip;
	this.port = port;
	this.rpcObj = rpcObj ? rpcObj : {
		"jsonrpc": "2.0",
		"params": {
			"type": 1,
			"chaincodeID": {
			},
			"ctorMsg": {
				"args": [
				]
			},
			"attributes": [
				"position"
			],
		},
		"id": 1
	};
	return this;
};

PeerProxy.prototype.version = "0.0.3";


/**
 * The setSecureContext method sets the user on behalf of who all subsequent
 * Hyperledger peer calls will be done by this proxy.
 * 
 * @param user {string} - The Hyperledger user.
 */
PeerProxy.prototype.setSecureContext = function(user) {
	if (this.rpcObj.params.secureContext)
		delete this.rpcObj.params.secureContext;
	if (user)
		this.rpcObj.params.secureContext = user;
	return this;
};


/**
 * The setChaincodeID method defines the chaincode on which transactions and queries
 * will be performed by this proxy.
 * 
 * @param idType {string} - Either "path" to a chaincode source folder to deploy, or 
 * "name" i.e. deployed chaincode hash id. 
 * @param idValue {string} - Chaincode path relative to $GOPATH/src, or hash value.
 */
PeerProxy.prototype.setChaincodeID = function(idType, idValue) {
	this.rpcObj.params.chaincodeID = {};
	this.rpcObj.params.chaincodeID[idType] = idValue;
	return this;
};


/**
 * The getQuery method makes the proxy perform a HTTP GET request on the peer.
 * 
 * @param url {string} - The full url including peer ip, port, and request parameters.
 * @param onOk {function} - Success callback, called with one result object for parameter.
 * @param onError {function} - Error callback, called with one error object for parameter.
 * @return {object} async - The object in the context of which the callbacks are executed.
 */
PeerProxy.prototype.getQuery = function(url, onOk, onError) {
	var xmlhttp = new platformAbstract.XMLHttpRequest();
	var async = {
		proxy: this,
		onOk: onOk,
		onError: onError
	};

	xmlhttp.onreadystatechange = xmlhttpRequestChange;
	xmlhttp.async = async;

	xmlhttp.open("GET", url, true);
	xmlhttp.send();
	return async;
};


/***
 * The deleteUri method makes the proxy perform a HTTP DELETE request on the peer.
 * 
 * @param url {string} - The full url including peer ip, port, and request parameters.
 * @param onOk {function} - Success callback, called with one result object for parameter.
 * @param onError {function} - Error callback, called with one error object for parameter.
 * @return {object} async - The object in the context of which the callbacks are executed.
 */
PeerProxy.prototype.deleteUri = function(url, onOk, onError) {
	var xmlhttp = new platformAbstract.XMLHttpRequest();
	var async = {
		proxy: this,
		onOk: onOk,
		onError: onError
	};

	xmlhttp.onreadystatechange = xmlhttpRequestChange;
	xmlhttp.async = async;

	xmlhttp.open("DELETE", url, true);
	xmlhttp.send();
	return async;
};


/**
 * The postJsonRpc method makes the proxy perform a HTTP application/json POST request on the peer.
 * 
 * @param url {string} - The full url including peer ip, port, and request parameters.
 * @param onOk {function} - Success callback, called with one result object for parameter.
 * @param onError {function} - Error callback, called with one error object for parameter.
 * @return {object} async - The object in the context of which the callbacks are executed.
 */
PeerProxy.prototype.postJsonRpc = function(url, onOk, onError) {
	var xmlhttp = new platformAbstract.XMLHttpRequest();
	var async = {
		proxy: this,
		onOk: onOk,
		onError: onError
	};

	xmlhttp.onreadystatechange = xmlhttpRequestChange;
	xmlhttp.async = async;

	xmlhttp.open("POST", url, true);
	xmlhttp.setRequestHeader("Content-Type","application/json");
	xmlhttp.send(JSON.stringify(this.rpcObj));
	return async;
};



/**
 * The Chaincode object is used to deploy chaincode on a Hyperledger peer.
 * 
 * @extends PeerProxy
 * @constructor
 * @param ip {string} - The peer ip address.
 * @param port {string} - The peer REST interface port.
 * @param rpcObj {object} - Optional object holding additional JSON RPC parameters.
 */
var Chaincode = function(ip, port, rpcObj) {
	PeerProxy.call(this, ip, port, rpcObj);
	this.rpcObj.method = "deploy";
	this.rpcObj.params.ctorMsg.function = "init";
	return this;
};
Object.setPrototypeOf(Chaincode.prototype, PeerProxy.prototype);
platformAbstract.exports.Chaincode = Chaincode;


/**
 * The deploy method is used to deploy the chaincode which path was already set on the
 * peer proxy with the setChaincodeID method.
 * 
 * @param func {string} - The deployment function name, usually "init".
 * @param args {array} - The deployment function parameters.
 * @param onOk {function} - Success callback, passed a result object containing the deployed chaincode id.
 * @param onError {function} - Error callback, called with one error object for parameter.
 * @return {object} async - The object in the context of which the callbacks are executed.
 */
Chaincode.prototype.deploy = function(func, args, onOk, onError) {
	this.rpcObj.params.ctorMsg.function = func;
	this.rpcObj.params.ctorMsg.args = args;
	return this.postJsonRpc("http://" + this.ip + ":" + this.port + "/chaincode", 
		function(objres) {
			return (onError && objres.error) ? onError(objres) : onOk(objres);
		}
		, onError);
};



/**
 * The Connection object is used to register a user on a Hyperledger peer.
 * 
 * @extends PeerProxy
 * @constructor
 * @param ip {string} - The peer ip address.
 * @param port {string} - The peer REST interface port.
 * @param user {string} - The Hyperledger member services user id.
 * @param password {string} - The user password.
 */
var Connection = function(ip, port, user, password) {
	PeerProxy.call(this, ip, port, {enrollId:user, enrollSecret:password});
	return this;
};
Object.setPrototypeOf(Connection.prototype, PeerProxy.prototype);
platformAbstract.exports.Connection = Connection;


/**
 * The login method.
 * 
 * @param onOk {function} - Success callback, called with one result object for parameter.
 * @param onError {function} - Error callback, called with one error object for parameter.
 * @return {object} async - The object in the context of which the callbacks are executed.
 */
Connection.prototype.login = function(onOk, onError) {
	return this.postJsonRpc("http://" + this.ip + ":" + this.port + "/registrar", onOk, onError);
};


/***
 * The logout method permanently bans a user from the Hyperledger member services.
 * 
 * @param onOk {function} - Success callback, called with one result object for parameter.
 * @param onError {function} - Error callback, called with one error object for parameter.
 * @return {object} async - The object in the context of which the callbacks are executed.
 */
Connection.prototype.logout = function(onOk, onError) {
	return this.deleteUri("http://" + this.ip + ":" + this.port + "/registrar/" + this.rpcObj.enrollId, onOk, onError);
};



/**
 * The Query object is used to perform queries on a Hyperledger peer.
 * 
 * @extends PeerProxy
 * @constructor
 * @param ip {string} - The peer ip address.
 * @param port {string} - The peer REST interface port.
 * @param rpcObj {object} - Optional object holding additional JSON RPC parameters.
 */
var Query = function(ip, port, rpcObj) {
	PeerProxy.call(this, ip, port, rpcObj);
	this.rpcObj.method = "query";
	this.rpcObj.params.ctorMsg.function = "query";
	return this;
};
Object.setPrototypeOf(Query.prototype, PeerProxy.prototype);
platformAbstract.exports.Query = Query;


/**
 * The query method performs a query, addressed by a single peer. 
 * 
 * The chaincode to be queried and the user performing the query  were set previously
 * on the peer proxy with the setChaincodeID and setSecureContext methods.
 * 
 * @param func {string} - The query function name.
 * @param args {array} - The query parameters.
 * @param onOk {function} - Success callback, passed an object containing the query results.
 * @param onError {function} - Error callback, called with one error object for parameter.
 * @return {object} async - The object in the context of which the callbacks are executed.
 */
Query.prototype.query = function(func, args, onOk, onError) {
	this.rpcObj.params.ctorMsg.function = func;
	this.rpcObj.params.ctorMsg.args = args;
	return this.postJsonRpc("http://" + this.ip + ":" + this.port + "/chaincode", onOk, onError);
};



/**
 * The Transaction object is used to perform transactions on a Hyperledger peer.
 * 
 * @extends PeerProxy
 * @constructor
 * @param ip {string} - The peer ip address.
 * @param port {string} - The peer REST interface port.
 * @param rpcObj {object} - Optional object holding additional JSON RPC parameters.
 */
var Transaction = function(ip, port, rpcObj) {
	PeerProxy.call(this, ip, port, rpcObj);
	this.rpcObj.method = "invoke";
	this.rpcObj.params.ctorMsg.function = "invoke";
	return this;
};
Object.setPrototypeOf(Transaction.prototype, PeerProxy.prototype);
platformAbstract.exports.Transaction = Transaction;


/**
 * The invoke method performs a transaction on a peer, that must be validated according
 * to the blockchain consensus. As of Hyperledger v0.6 the underlying REST method may
 * succeed even if the transaction is actually rejected. This method polls the peer that
 * received the transaction request and makes sure the transaction id was actually found in
 * the blockchain copy (ledger) of that peer before invoking the onOk callback, otherwise 
 * calls the onError callback on timeout.
 * 
 * The chaincode, and the user performing the transaction were set previously
 * on the peer proxy with the setChaincodeID and setSecureContext methods.
 * 
 * @param func {string} - The query function name.
 * @param args {array} - The query parameters.
 * @param onOk {function} - Success callback, passed an object containing the query results.
 * @param onError {function} - Error callback, called with one error object for parameter.
 * @return {object} async - The object in the context of which the callbacks are executed.
 */
Transaction.prototype.invoke = function(func, args, onOk, onError) {
	this.rpcObj.params.ctorMsg.function = func;
	this.rpcObj.params.ctorMsg.args = args;
	var proxy = this;
	var imin, imax, txid, objres;
	var delayTimeout = 2000;
	var delayStep = 500;
	var async = {
		proxy: this,
		onOk: onOk,
		onError: onError
	};

	var txIndex = function(block, txid) {
		if (block.transactions)
			for (var i=0; i<block.transactions.length; i++)
				if (block.transactions[i].txid === txid)
					return i;
		return -1;
	};

	var seekTransaction = function(imin, imax, txid) {
		if (imax < imin)
			return async.onError ? async.onError(objres) : null;
		proxy.getQuery(
			"http://" + proxy.ip + ":" + proxy.port + "/chain/blocks/" + imax,
			function(block) {
				if (txIndex(block, txid) >= 0) {
					if (async.onOk)
						async.onOk(objres);
					return;
				}
				seekTransaction(imin, imax-1, txid);
			},
			async.onError);
	};

	var getBlockchainHeight = function(heightCb) {
		proxy.getQuery(
			"http://" + proxy.ip + ":" + proxy.port + "/chain",
			function(chain) {
				heightCb(Number(chain.height));
			},
			async.onError);
	};

	var gotMaxHeight = function(height) {
		if (height === imin && delayTimeout > 0) {
			setTimeout(function() {
				delayTimeout -= delayStep;
				getBlockchainHeight(gotMaxHeight);
			},
			delayStep);
			return;
		}
		imax = height - 1;
		seekTransaction(imin, imax, txid);
	};

	var gotMinHeight = function(height) {
		imin = height;
		proxy.postJsonRpc(
			"http://" + proxy.ip + ":" + proxy.port + "/chaincode",
			function(obj) {
				if (obj.error)
					return async.onError ? async.onError(obj) : null;
				txid = obj.result.message;
				objres = obj;
				getBlockchainHeight(gotMaxHeight);
			},
			async.onError);
	};

	getBlockchainHeight(gotMinHeight);
	return async;
};
