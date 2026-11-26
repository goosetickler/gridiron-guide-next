// Shared FLIP displacement calculation. No DOM writes or forced layout.
function ggVisibleFlipOffset(old,next,viewportHeight){
  const dy=old.top-next.top;
  return Math.abs(dy)<1||Math.max(old.bottom,next.bottom)<0||Math.min(old.top,next.top)>viewportHeight?null:dy;
}
function ggAnimateDisplacedCards(positions,activeCard,viewportHeight,timing,animations){
  for(const {el,old,next} of positions){
    if(el===activeCard)continue;
    const dy=ggVisibleFlipOffset(old,next,viewportHeight);
    if(dy===null)continue;
    animations.push(el.animate([{transform:'translateY('+dy+'px)'},{transform:'translateY(0)'}],timing));
  }
}
