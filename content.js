const youtubecontrol = {
	deniedMsg: undefined,
	dataUrl: null,
	imgSrcSchedule: null,
	imgSrcIgnore: null,
	goSubscriptions: false,
	getContainsTimeTo: (from, durationHours, now) => {
		const dtFrom = new Date(from);
		const dtTo = new Date(dtFrom.getTime() + (durationHours * 60 * 60 * 1000));
		return dtFrom <= now && now <= dtTo ? dtTo : null;
	},
	getSchedules: (personalKey) => {
		return youtubecontrol.jsonData['schedule' + personalKey];
	},
	getForcedTimeTo: (operation, personalKey, now) => {
		const operationProp = operation + 'From';
		const prop = 'forceControl';

		let lastOperatedTimeTo = undefined;
		[prop, prop + personalKey].forEach(jsonProp => {
			const forceControl = youtubecontrol.jsonData[jsonProp][0];
			const timeTo = youtubecontrol.getContainsTimeTo(forceControl[operationProp], forceControl.durationHours, now);
			if (timeTo) {
				if (lastOperatedTimeTo == undefined || timeTo > lastOperatedTimeTo) {
					lastOperatedTimeTo = timeTo;
				}
			}
		});
		return lastOperatedTimeTo;
	},
	getForcedProp: (forcedProp, personalKey) => {
		const prop = 'forceControl';

		let propVal = undefined;
		[prop, prop + personalKey].forEach(jsonProp => {
			const forceControl = youtubecontrol.jsonData[jsonProp][0];
			const val = forceControl[forcedProp];
			if (val) {
				if (propVal == undefined || val > propVal) {
					propVal = val;
				}
			}
		});
		return propVal;
	},
	fetchJsonData: () => {
		console.log('fetchJsonData called -> ' + youtubecontrol.dataUrl);
		fetch(youtubecontrol.dataUrl, {cache: 'no-cache'})
			.then(res => res.json()) // フェッチしたデータを JSON 形式に変換
			.then(jsonData => {youtubecontrol.jsonData = jsonData}); // JSONを保持
	},
	deny: (msg) => {
		youtubecontrol.pause();
		if (msg != youtubecontrol.deniedMsg) {
			console.log('deny called. because ' + msg);
		}
		youtubecontrol.deniedMsg = msg;
	},
	pause: () => {
		const video = youtubecontrol.getVideo();
		if (video != {}) {
			video.pause();
		}
	},
	isPaused: () => {
		return youtubecontrol.getVideo().paused;
	},
	getVideo: () => {
		const video = document.getElementsByClassName('video-stream html5-main-video');
		return video.length ? video[0] : {};
	},
	getAvatarImg: () => {
		const avatarImgs = Array.from(document.querySelectorAll('img#img')).filter(e => e.alt == 'アバターの画像');
		return avatarImgs.length ? avatarImgs[0] : {};
	},
	toHhmm: (tm) => {
		if (new String(tm).match(/^[0-2]?[0-9]:[0-5][0-9]$/)) {
			return ("0" + tm).slice(-5);
		}
		const dt = new Date(tm);
		return ('00' + dt.getHours()).slice(-2) + ':' + ('00' + dt.getMinutes()).slice(-2);
	},
	interval: () => {
//		console.log('interval called');
		const img = youtubecontrol.getAvatarImg();
		const personalKey = youtubecontrol.imgSrcSchedule == img.src ? 'Ha' : 'Yu';
		
		if (youtubecontrol.goSubscriptions && !youtubecontrol.isPaused()) {
			window.location.href = 'https://www.youtube.com/feed/subscriptions';
		}
		if (youtubecontrol.deniedMsg && window.location.href.match('https://www.youtube.com/watch\?') && !youtubecontrol.isPaused()) {
			console.log('denied at ' + window.location.href);
			youtubecontrol.deny(youtubecontrol.deniedMsg);
			alert(youtubecontrol.deniedMsg);

			youtubecontrol.deniedMsg = undefined;
			youtubecontrol.goSubscriptions = true;
			return;
		}

		const now = new Date();
		if (now.getMinutes() % 5 == 0 && now.getSeconds() < 3) {	// 5分毎に jsonData を再取得
			youtubecontrol.fetchJsonData();
		}

		let imgTooltip = '';
		// force denied?
		const deniedTimeTo = youtubecontrol.getForcedTimeTo('denied', personalKey, now);
		if (deniedTimeTo) {
			youtubecontrol.deny(deniedTimeTo + ' までは禁止時間です');
			imgTooltip = deniedTimeTo + ' までは禁止';
		}

		// force allowed?
		const allowedTimeTo = youtubecontrol.getForcedTimeTo('allowed', personalKey, now);
		if (allowedTimeTo && !deniedTimeTo) {
			imgTooltip = allowedTimeTo + ' まで許可';
			youtubecontrol.goSubscriptions = false;
		}

		// schedule denied?
		let dayOfWeek = now.getDay();
		try {
			if (now.getTime() - new Date(youtubecontrol.getForcedProp('dateToBeTreatAsHoliday', personalKey)).getTime() < 24 * 60 * 60 * 1000) {
				dayOfWeek = 0;
			}
		} catch {
			// ignore
		}
		const hhmm = youtubecontrol.toHhmm(now);
		const schedules = youtubecontrol.getSchedules(personalKey);
		const deniedSchedule = schedules.find(elem => elem.day == dayOfWeek && youtubecontrol.toHhmm(elem.from) <= hhmm && hhmm <= youtubecontrol.toHhmm(elem.to));
		if (!deniedTimeTo && !allowedTimeTo && deniedSchedule) {
			youtubecontrol.deny(youtubecontrol.toHhmm(deniedSchedule.from) + ' から ' + youtubecontrol.toHhmm(deniedSchedule.to) + ' までは禁止時間です');
		} 
		if (!deniedTimeTo && !deniedSchedule) {
			youtubecontrol.goSubscriptions = false;
		}

		imgTooltip += (!imgTooltip ? '' : '\n') + '---- 今日の禁止時間残 ----';
		schedules.filter(elem => elem.day == dayOfWeek && youtubecontrol.toHhmm(elem.to) >= hhmm)
			.forEach(elem => imgTooltip = imgTooltip + '\n' + youtubecontrol.toHhmm(elem.from) + '～' + youtubecontrol.toHhmm(elem.to));
		img.title = imgTooltip;
	}
};

window.onload = function() {
	youtubecontrol.fetchJsonData();
	if (youtubecontrol.getAvatarImg().src == youtubecontrol.imgSrcIgnore) {
		return;
	}

	const intervalId = setInterval(youtubecontrol.interval, 3 * 1000)	// 3秒周期

	const intervalId2 = setInterval(function() {
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
