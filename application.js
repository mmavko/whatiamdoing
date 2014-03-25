/** @jsx React.DOM */

LINE_HEIGHT = 18;

LOCAL_STORAGE_KEY = 'text';

NOW_WORDS = [
	'now', // english
	'teraz', // polish
	'тепер', 'зараз', // ukrainian
	'теперь', 'сейчас' // russian
];

INITIAL_LOG = [
	'10:00 working: task 1',
	'11:00 break',
	'11:20 working: task 1',
	'14:00 launch',
	'15:00 working: task 2',
	'17:00 break',
	'17:20 working: task 2',
	'19:00 going home!',
].join("\n");

ROOT_NODE_NAME = 'Total';
REST_NODE_NAME = '<unknown>';



var pad = function (symbol, length, str) {
	var result = '' + str;
	while (result.length < length) { result = symbol + result; }
	return result;
};

var utils = {
	pad: pad,
	padForWatch: pad.bind(null, '0', 2),
	watchTime: function (minutes) {
		return '' + Math.floor(minutes/60) + ':' + this.padForWatch(minutes % 60);
	}
};



function Node(name) {
	this.name = name;
	this.time = 0;
	this.children = {};
}

Node.prototype.add = function (time) {
	this.time += time;
};

Node.prototype.access = function (link) {
	return this.children[link] || (this.children[link] = new Node(link));
};

Node.prototype.getChildren = function () {
	return Object.keys(this.children).map(function (link) {return this.children[link];}, this);
};

Node.prototype.sumup = function () {
	this.getChildren().forEach(function (node) {node.sumup();});
	var sum = this.getChildren().reduce(function (res, node) {return res + node.time;}, 0);
	if (this.getChildren().length > 0 && this.time - sum > 0) {
		var restNode = this.access(REST_NODE_NAME);
		restNode.add(this.time - sum);
	}
};



function Log(source) {
	this.set(source);
}

Log.prototype.set = function (source) {
	this._parse(source || '');
};

Log.prototype.getText = function () {
	return this.source;
};

Log.prototype.getLines = function () {
	return this._lines;
};

Log.prototype.getStats = function () {
	return this._rootStatNode;
};

Log.prototype._parse = function (source) {
	this.source = this._handleNowWords(source);
	this._process();
};

Log.prototype._handleNowWords = function (source) {
	var now = new Date;
	var nowStr = utils.padForWatch(now.getHours()) + ':' + utils.padForWatch(now.getMinutes());
	var re = new RegExp('\n(' + NOW_WORDS.join('|') + ') (\n*)$');
	return ("\n" + source).replace(re, "\n" + nowStr + ' ').replace(/^\n/, '');
};

Log.prototype._process = function () {
	var lines = this.source.split("\n").map(function (line) {
		var matches, hours, minutes, rawPath, path;
		if (matches = line.match(/(\d\d):(\d\d)\s+(.+)/)) {
			hours = matches[1];
			minutes = matches[2];
			rawPath = matches[3];
			path = rawPath.split(/\s*:\s*/);
			return {
				minute: parseInt(hours, 10) * 60 + parseInt(minutes, 10),
				path: path
			};
		}
		else {
			return null;
		}
	});
	var records = lines.filter(function (r) {return r;});
	var rootNode = new Node(ROOT_NODE_NAME);
	// temporary solution to enable multiple day usage
	var ignoreList = ['home', 'end'];
	records.length > 0 && records.reduce(function (record, nextRecord) {
		var duration = nextRecord.minute - record.minute;
		if (ignoreList.indexOf(record.path[0]) >= 0) {
			return nextRecord;
		}
		var currentNode = rootNode;
		currentNode.add(duration);
		record.path.forEach(function (link) {
			currentNode = currentNode.access(link);
			currentNode.add(duration);
		});
		return nextRecord;
	});
	rootNode.sumup();
	this._lines = lines;
	this._rootStatNode = rootNode;
};



var WhatIAmDoingApp = React.createClass({

	componentWillMount: function () {
		this.log = new Log(localStorage.getItem(LOCAL_STORAGE_KEY) || INITIAL_LOG);
	},

	storeLog: function (text) {
		localStorage.setItem(LOCAL_STORAGE_KEY, text);
	},

	onChange: function (e) {
		var text = e.target.value;
		this.storeLog(text);
		this.log.set(text);
		this.forceUpdate();
	},

	renderNodes: function () {
		function renderNode(level, node) {
			var children = node.getChildren().map(renderNode.bind(null, level+1));
			if (children.length > 0) {
				children = <ul className={"nodes level-"+level}>{children}</ul>;
			}
			else {
				children = null;
			}
			return (
				<li key={node.name}>
					<div>{node.name}: {utils.watchTime(node.time)}</div>
					{children}
				</li>
			);
		}
		return <ul className={"nodes level-root"}>{renderNode(1, this.log.getStats())}</ul>;
	},

	render: function() {
		var text = this.log.getText();
		var textareaHeight = LINE_HEIGHT * text.split("\n").length;
		var lines = this.log.getLines().map(function (record) {
			return <div style={{'height': LINE_HEIGHT}}>{record ? '✔' : null}</div>;
		});
		return (
			<div className="container">
				<div className="lines">{lines}</div>
				<textarea style={{height: textareaHeight + 5, 'line-height': LINE_HEIGHT}} value={text} onChange={this.onChange} />
				{this.renderNodes()}
			</div>
		);
	}
});

React.renderComponent(<WhatIAmDoingApp/>, document.body);
