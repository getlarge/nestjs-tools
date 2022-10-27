// eslint-disable-next-line no-control-regex
export const ASCII_COLORS_REGEX = /[\u001b\u009b][[()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/*
 * 2022-01-01T01:01:01.000000+00:00 app[web.1]: Your message here
 */
export const HEROKU_LOG_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}\+\d{2}.\d{2} [a-z]*?\[[^()]*?\]: /g;

/*
 * 2022-01-01T01:01:01.000000+00:00 d.9173ea1f-6f14-4976-9cf0-7cd0dafdcdbc app[web.1] Your message here.
 */
export const HEROKU_SYSLOG_DRAIN_REGEX =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{6}\+\d{2}.\d{2} [^()]*? [a-z]*?\[[^()]*?\] /g;

/*
 * 83 <40>1 2022-01-01T01:01:01+00:00 host app web.3 - Your message here
 */
export const HEROKU_HTTPS_DRAIN_REGEX =
  /\d*? <\d*?>\d{1} \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+\d{2}.\d{2} [a-z]*? [a-z]*? [^()]*? - /g;
