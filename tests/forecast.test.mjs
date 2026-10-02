import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseForecast,forecastTypes} from '../src/lib/forecast.ts';
test('forecast preserves zero rain and missing readings without inventing dry weather',()=>{
 const rows=parseForecast({response:{'weather.home':{forecast:[{datetime:'2026-10-03T02:00:00Z',temperature:15,precipitation:0},{datetime:'invalid',temperature:100},{datetime:'2026-10-02T02:00:00Z',temperature:null,humidity:80}]}}},'weather.home');
 assert.equal(rows.length,2);assert.equal(rows[0].temperature,null);assert.equal(rows[0].precipitation,null);assert.equal(rows[1].precipitation,0);
});
test('unsupported or malformed forecast response surfaces an error',()=>{
 assert.throws(()=>parseForecast({response:null},'weather.home'),/did not return/);
 assert.deepEqual(forecastTypes(3),['daily','hourly']);assert.deepEqual(forecastTypes(0),[]);
});
