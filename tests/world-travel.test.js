import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../gameEngine.js';
import { WORLD, PARK_BOUNDS, roadPaths, locations, getRegionAt } from '../story/locations.js';

test('the Shitmobile can cross the former park boundary and keep driving on the outside map',()=>{
 const game=new GameEngine({storage:null,random:()=>.5});
 Object.assign(game.state.vehicle,{x:1660,y:2320,angle:Math.PI/2,speed:100,driving:true});
 Object.assign(game.state.player,{x:1660,y:2320});
 for(let frame=0;frame<40;frame++)game.move(0,-1,.1);
 assert.ok(game.state.vehicle.y>PARK_BOUNDS.height+500,'The old park edge still stops the car');
 assert.ok(game.state.vehicle.driving);
 assert.notEqual(getRegionAt(game.state.player.x,game.state.player.y).id,'sunnyvale');
 assert.ok(game.state.player.x<WORLD.width&&game.state.player.y<WORLD.height);
});

test('every marked road has clearance for the complete Shitmobile, including its front corners',()=>{
 const game=new GameEngine({storage:null});
 for(const [roadIndex,road] of roadPaths.entries())for(let segment=1;segment<road.points.length;segment++){
  const a=road.points[segment-1],b=road.points[segment],length=Math.hypot(b.x-a.x,b.y-a.y);
  if(!length)continue;
  const angle=Math.atan2(b.y-a.y,b.x-a.x),samples=Math.ceil(length/12);
  for(let n=0;n<=samples;n++){
   const x=a.x+(b.x-a.x)*n/samples,y=a.y+(b.y-a.y)*n/samples;
   assert.equal(game.vehicleBlocked(x,y,angle),false,`Road ${roadIndex}, segment ${segment} clips a building near ${Math.round(x)},${Math.round(y)}`);
  }
 }
});

test('the distant city and travel destinations are part of the same reachable world',()=>{
 const city=locations.find(l=>l.id==='mall'),entrance={x:1660,y:2360};
 assert.ok(Math.hypot(city.door.x-entrance.x,city.door.y-entrance.y)>4000,'The city should be a real trip beyond the park');
 assert.equal(getRegionAt(city.door.x,city.door.y).id,'city');
 const game=new GameEngine({storage:null});
 for(const id of ['mall','gasStation','quarry','lake','cityDiner','pawnShop','liquorStore','cityJunkyard']){
  const place=locations.find(l=>l.id===id);
  assert.ok(place,`Missing travel destination ${id}`);
  assert.equal(game.isBlocked(place.door.x,place.door.y),false,`Blocked entrance ${id}`);
  Object.assign(game.state.player,place.door);
  assert.equal(game.enterBuilding(id),true,`Cannot enter ${id}`);
  assert.equal(game.state.scene,id);
  assert.equal(game.exitBuilding(),true,`Cannot leave ${id}`);
 }
});
