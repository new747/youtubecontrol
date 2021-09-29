const youtubecontrol = {
	deniedMsg: undefined,
	dataUrl: null,
	imgSrcSchedule: null,
	imgSrcIgnore: null,
	getContainsTimeTo: (from, durationHours, now) => {
		const dtFrom = new Date(from);
		const dtTo = new Date(dtFrom.getTime() + (durationHours * 60 * 60 * 1000));
		return dtFrom <= now && now <= dtTo ? dtTo : null;
	},
	fetchJsonData: () => {
		console.log('fetchJsonData called -> ' + youtubecontrol.dataUrl);
		fetch(youtubecontrol.dataUrl)
			.then(res => res.json()) // フェッチしたデータを JSON 形式に変換
			.then(jsonData => {youtubecontrol.jsonData = jsonData}); // JSONを保持
	},
	deny: (msg) => {
		document.getElementsByClassName('video-stream html5-main-video')[0].pause()
		if (msg != youtubecontrol.deniedMsg ) {
			console.log('deny called. because ' + msg);
		}
		youtubecontrol.deniedMsg = msg;
	},
	interval: () => {
//		console.log('interval called');
		const imgSrc = document.getElementById('img').src;
		if (imgSrc == youtubecontrol.imgSrcIgnore) {
			return;
		}
		
		if (youtubecontrol.deniedMsg && window.location.href.match('https://www.youtube.com/watch\?')) {
			console.log('denied at ' + window.location.href);
			youtubecontrol.deny(youtubecontrol.deniedMsg);
			alert(youtubecontrol.deniedMsg);

			youtubecontrol.deniedMsg = undefined;
			window.location.href = 'https://www.youtube.com/feed/subscriptions';
			return;
		}

		const now = new Date();
		if (now.getMinutes() % 5 == 0 && now.getSeconds() < 5) {	// 5分毎に jsonData を再取得
			youtubecontrol.fetchJsonData();
		}

		const forceControl = youtubecontrol.jsonData.forceControl[0];
		// force denied?
		let timeTo = youtubecontrol.getContainsTimeTo(forceControl.deniedFrom, forceControl.durationHours, now);
		if (timeTo) {
			youtubecontrol.deny(timeTo + ' までは禁止時間です');
			return;
		}

		// force allowed?
		if (youtubecontrol.getContainsTimeTo(forceControl.allowedFrom, forceControl.durationHours, now)) {
			return;
		}

		// schedule denied?
		const hhmm = ('00' + now.getHours()).slice(-2) + ':' + ('00' + now.getMinutes()).slice(-2);
		const schedules = youtubecontrol.imgSrcSchedule == imgSrc ? youtubecontrol.jsonData.schedule : youtubecontrol.jsonData.schedule2;
		const deniedSchedule = schedules.find(elem => elem.day == now.getDay() && elem.from <= hhmm && hhmm <= elem.to);
		if (deniedSchedule) {
			youtubecontrol.deny(deniedSchedule.from + ' から ' + deniedSchedule.to + ' までは禁止時間です');
		}
	}
};

window.onload = function() {
	youtubecontrol.fetchJsonData();

	const intervalId = setInterval(youtubecontrol.interval, 5 * 1000)	// 5秒周期

	const intervalId2 = setInterval(function() {
		if (document.getElementById('img').src == youtubecontrol.imgSrcIgnore) {
			return;
		}

		document.querySelectorAll('div#secondary').forEach(elem => {elem.hidden = true});
		const subscribeButtons = document.querySelectorAll('ytd-subscribe-button-renderer > tp-yt-paper-button');
		subscribeButtons.forEach(btn => {
			btn.hidden = true;
			
			if (window.location.href.match('https://www.youtube.com/watch\?') && btn.closest('#subscribe-button') && !btn.hasAttribute('subscribed')) {
				window.location.href = 'https://www.youtube.com/feed/subscriptions';
			}
		});
	}, 1500);
};
