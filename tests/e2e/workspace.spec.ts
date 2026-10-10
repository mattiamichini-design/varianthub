import { type APIRequestContext } from '@playwright/test';
import { expect, openExploration, test } from './fixtures';

test.beforeEach(async({page})=>page.setViewportSize({width:1775,height:1066}));

async function setLayout(request:APIRequestContext,baseURL:string,key:string,columns=1,compared?:string[]) {
  const origin=new URL(baseURL).origin;
  const session=await (await request.get('/api/workspace')).json();
  const current=await (await request.get(`/api/workspace/${key}`)).json();
  const ids=Array.from({length:12},(_,index)=>`direction-${index+1}`);
  const response=await request.put(`/api/workspace/${key}`,{headers:{Origin:origin,'X-VariantHub-Token':session.token},data:{revision:current.revision,layout:{version:1,variantOrder:ids,comparedVariantIds:compared??ids,gridCols:columns}}});
  expect(response.status()).toBe(200);
}

test('all twelve registrations stay visible below the twenty variant limit',async({page,request,baseURL})=>{
  expect((await request.get('/api/workspace/variant-growth-limit')).status()).toBe(200);
  await setLayout(request,baseURL!,'responsive-controls');
  await openExploration(page,'responsive-controls');
  await expect(page.getByText('12 visible',{exact:false})).toBeVisible();
  await expect(page.locator('.vh-page-card')).toHaveCount(12);
  await page.getByRole('button',{name:'More actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Manage variants',exact:true}).click();
  const chooser=page.getByRole('dialog',{name:'Visible variants',exact:true});
  await expect(chooser.getByRole('button',{name:'Direction 12',exact:true})).toBeVisible();
  await expect(chooser.getByText('12 selected · 20 maximum')).toBeVisible();
  await chooser.getByRole('button',{name:'Clear all',exact:true}).click();
  await expect(chooser.getByRole('button',{name:'Apply',exact:true})).toBeDisabled();
  await chooser.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.locator('.vh-page-card')).toHaveCount(12);
  await page.getByRole('button',{name:'More actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Manage variants',exact:true}).click();
  await chooser.getByRole('button',{name:'Direction 12',exact:true}).click();
  await chooser.getByRole('button',{name:'Select all',exact:true}).click();
  await chooser.getByRole('button',{name:'Apply',exact:true}).click();
  await page.locator('button[title="4 columns"]:visible').click();
  await expect.poll(async()=> (await (await request.get('/api/workspace/responsive-controls')).json()).layout.gridCols).toBe(4);
  await page.reload();
  await expect(page.locator('button[title="4 columns"]:visible')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.vh-page-card')).toHaveCount(12);
  expect(await page.locator('iframe').count()).toBeLessThanOrEqual(12);
});

test('six new variants open a capacity review and keep the current twenty until Apply',async({page})=>{
  const existing=Array.from({length:20},(_,index)=>`growth-${index+1}`);
  let revision='seed';
  let layout:{version:number;variantOrder:string[];comparedVariantIds:string[];pendingVariantIds?:string[];gridCols:number}={version:1,variantOrder:existing,comparedVariantIds:existing,gridCols:2};
  await page.addInitScript(()=>localStorage.clear());
  await page.route('**/api/workspace**',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    if(url.pathname==='/api/workspace'){
      await route.fulfill({json:{projectId:'varianthub-demo',token:'test-token',metadata:{}}});
      return;
    }
    if(url.pathname==='/api/workspace/variant-growth-limit'){
      if(request.method()==='PUT'){
        layout=(request.postDataJSON() as {layout:typeof layout}).layout;
        revision=`saved-${Date.now()}`;
      }
      await route.fulfill({json:{revision,layout}});
      return;
    }
    await route.continue();
  });
  await page.goto('/items/variant-growth-limit');
  const chooser=page.getByRole('dialog',{name:'6 new variants added',exact:true});
  await expect(chooser).toBeVisible();
  await expect(page.locator('.vh-card')).toHaveCount(20);
  await expect(chooser.locator('.vh-variant-new-badge')).toHaveCount(6);
  await expect(chooser.getByText('26 selected · 20 maximum')).toBeVisible();
  const rows=chooser.locator('.vh-variant-chooser-option');
  await expect(rows.first()).toContainText('Growth direction 01');
  await chooser.getByRole('button',{name:'Oldest first. Show newest first'}).click();
  await expect(rows.first()).toContainText('Growth direction 26');
  await expect(rows.first().locator('.vh-variant-chooser-number')).toHaveText('26');
  await expect(rows.last()).toContainText('Growth direction 01');
  await expect(chooser.getByText('26 selected · 20 maximum')).toBeVisible();
  await expect(chooser.getByRole('button',{name:'Apply',exact:true})).toBeDisabled();
  await chooser.getByRole('button',{name:'Clear all',exact:true}).click();
  await expect(chooser.getByText('0 selected · 20 maximum')).toBeVisible();
  await expect(chooser.getByRole('button',{name:'Apply',exact:true})).toBeDisabled();
  await chooser.getByRole('button',{name:'First 20',exact:true}).click();
  await expect(chooser.getByRole('button',{name:/^Growth direction 01/})).toHaveAttribute('aria-pressed','true');
  await expect(chooser.getByRole('button',{name:/^Growth direction 21/})).toHaveAttribute('aria-pressed','false');
  await chooser.getByRole('button',{name:'Latest 20',exact:true}).click();
  await expect(chooser.getByRole('button',{name:/^Growth direction 01/})).toHaveAttribute('aria-pressed','false');
  await expect(chooser.getByRole('button',{name:/^Growth direction 07/})).toHaveAttribute('aria-pressed','true');
  await expect(chooser.getByRole('button',{name:/^Growth direction 26/})).toHaveAttribute('aria-pressed','true');
  await chooser.getByRole('button',{name:'Newest first. Show oldest first'}).click();
  await expect(rows.first()).toContainText('Growth direction 01');
  await page.setViewportSize({width:390,height:480});
  const dialogBox=await chooser.locator('.vh-comparison-dialog').boundingBox();
  const footerBox=await chooser.locator('.vh-variant-discovery-footer').boundingBox();
  expect(dialogBox).toMatchObject({x:16,width:358});
  expect(footerBox!.y+footerBox!.height).toBeLessThanOrEqual(464);
  expect(await chooser.locator('.vh-comparison-dialog-options').evaluate(element=>element.scrollHeight>element.clientHeight)).toBe(true);
  await page.setViewportSize({width:1280,height:720});
  await expect.poll(()=>layout.pendingVariantIds ?? []).toEqual(Array.from({length:6},(_,index)=>`growth-${index+21}`));
  await chooser.getByRole('button',{name:'Later',exact:true}).click();
  await expect(chooser).toBeHidden();
  await page.evaluate(()=>{(window as Window & {__growthNavigationProbe?:string}).__growthNavigationProbe='stable';});
  await page.getByRole('button',{name:'Variant growth limit',exact:true}).click();
  await page.getByRole('dialog',{name:'Choose an exploration'}).getByRole('combobox',{name:'Search explorations'}).fill('Responsive controls');
  await page.getByRole('option',{name:/Responsive controls/}).click();
  await expect(page).toHaveURL(/\/items\/responsive-controls$/);
  await page.getByRole('button',{name:'Responsive controls',exact:true}).click();
  await page.getByRole('dialog',{name:'Choose an exploration'}).getByRole('combobox',{name:'Search explorations'}).fill('Variant growth limit');
  await page.getByRole('option',{name:/Variant growth limit/}).click();
  await expect(page).toHaveURL(/\/items\/variant-growth-limit$/);
  expect(await page.evaluate(()=>(window as Window & {__growthNavigationProbe?:string}).__growthNavigationProbe)).toBe('stable');
  await expect(chooser).toBeVisible();
  await chooser.getByRole('button',{name:'Later',exact:true}).click();
  await page.reload();
  await expect(chooser).toBeVisible();
  for(let index=1;index<=6;index++)await chooser.getByRole('button',{name:new RegExp(`^Growth direction 0${index}`)}).click();
  await expect(chooser.getByText('Ready to apply')).toBeVisible();
  await chooser.getByRole('button',{name:'Apply',exact:true}).click();
  await expect(chooser).toBeHidden();
  await expect(page.locator('.vh-card')).toHaveCount(20);
  await expect(page.getByText('Growth direction 21',{exact:true})).toBeVisible();
  await expect.poll(()=>layout.pendingVariantIds ?? []).toEqual([]);
  await page.reload();
  await expect(page.getByRole('dialog',{name:/new variants added/})).toHaveCount(0);
  await expect(page.locator('.vh-card')).toHaveCount(20);
});

test('an external layout change is visible and reload recovers without overwriting it',async({page,request,baseURL})=>{
  await setLayout(request,baseURL!,'responsive-controls',2);
  await page.goto('/items/responsive-controls');
  await expect(page.locator('button[title="2 columns"]:visible')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.vh-save-status--saved')).toHaveAttribute('title','Saved');
  await setLayout(request,baseURL!,'responsive-controls',3);
  await page.locator('button[title="4 columns"]:visible').click();
  await page.getByRole('button',{name:/Save conflict/}).click();
  const conflict=page.getByRole('dialog',{name:'Resolve save conflict'});
  await expect(conflict.getByText('Reloading the shared layout replaces your local unsaved choices.')).toBeVisible();
  expect((await (await request.get('/api/workspace/responsive-controls')).json()).layout.gridCols).toBe(3);
  await conflict.getByRole('button',{name:'Reload shared layout'}).click();
  await expect(page.locator('button[title="3 columns"]:visible')).toHaveAttribute('aria-pressed','true');
});

test('save failure details do not retry until the explicit action',async({page})=>{
  let putCount=0;
  let revision='seed';
  const ids=Array.from({length:12},(_,index)=>`direction-${index+1}`);
  let layout={version:1,variantOrder:ids,comparedVariantIds:ids,gridCols:2};
  await page.route('**/api/workspace/responsive-controls*',async route=>{
    if(route.request().method()!=='PUT')return route.fulfill({json:{revision,layout}});
    putCount++;
    if(putCount>1){revision='saved';layout=route.request().postDataJSON().layout;}
    await route.fulfill(putCount===1?{status:500,json:{error:'Workspace file is temporarily unavailable.'}}:{json:{revision:'saved'}});
  });
  await page.goto('/items/responsive-controls');
  await expect(page.locator('.vh-save-status')).toHaveAttribute('title','Saved');
  await page.locator('.vh-toolbar-grid-button[aria-pressed="false"]:visible').first().click();
  const status=page.getByRole('button',{name:/Save failed/});
  await expect(status).toBeVisible();
  expect(putCount).toBe(1);
  await status.focus();
  await page.keyboard.press('Enter');
  const details=page.getByRole('dialog',{name:'Save layout details'});
  await expect(details.getByText('Workspace file is temporarily unavailable.')).toBeVisible();
  await expect(details.getByRole('button',{name:'Retry save'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(details).toBeHidden();
  await expect(status).toBeFocused();
  await page.setViewportSize({width:320,height:480});
  await page.keyboard.press('Enter');
  const detailsBox=await details.boundingBox();
  expect(detailsBox!.x).toBeGreaterThanOrEqual(0);
  expect(detailsBox!.x+detailsBox!.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(await page.locator('button button').count()).toBe(0);
  expect(putCount).toBe(1);
  await details.getByRole('button',{name:'Retry save'}).click();
  await expect.poll(()=>putCount).toBe(2);
  await expect(page.locator('.vh-selector-trigger-main .vh-save-status')).toHaveAttribute('title','Saved');
  await expect(page.locator('.vh-page-exploration > .vh-save-status-wrap')).toHaveCount(0);
});

test('home has deterministic covers, source truth, empty search and mobile overflow control',async({page})=>{
  await page.route('**/api/workspace?refresh', route => route.fulfill({json:{projectId:'varianthub-demo',token:'test',metadata:{'action-surface':{history:'git',localChanges:true,lastCommit:'2026-09-15T10:00:00Z'}}}}));
  await page.goto('/workspace');
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('.vh-exploration-modified[title="Uncommitted source changes"]').first()).toBeVisible();
  const cover=page.locator('.vh-exploration-cover').first();
  const color=await cover.evaluate(element=>getComputedStyle(element).backgroundColor);
  await page.reload();
  await expect(cover).toHaveCSS('background-color',color);
  await page.getByRole('textbox',{name:'Search explorations'}).fill('not-a-real-exploration');
  await expect(page.getByText(/No explorations found|No matching explorations|No results/i)).toBeVisible();
  await page.getByRole('textbox',{name:'Search explorations'}).fill('');
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('textbox',{name:'Search explorations'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'output/playwright/workspace-home-mobile.png',fullPage:true});
});

test('canvas presets prevent overlap, resize selects Custom, and live state survives camera movement',async({page,request,baseURL})=>{
  await setLayout(request,baseURL!,'responsive-controls');
  await page.goto('/items/responsive-controls');
  await expect(page.locator('.vh-save-status--saved')).toHaveAttribute('title','Saved');
  await page.getByRole('button',{name:'Canvas',exact:true}).click();
  await expect(page.locator('.vh-canvas-artboard')).toHaveCount(12);
  const viewport=page.getByRole('button',{name:'Viewport',exact:true});
  await viewport.click();
  await expect(page.getByText('Viewport presets',{exact:true})).toBeVisible();
  const menu=page.getByRole('menu',{name:'Viewport presets',exact:true});
  await viewport.click();
  await expect(menu).toBeHidden();
  await viewport.click();
  await expect(menu).toBeVisible();
  const triggerBox=await viewport.boundingBox();
  const menuBox=await menu.boundingBox();
  expect(Math.abs(menuBox!.x-triggerBox!.x)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');
  await expect(viewport).toBeFocused();
  await viewport.click();
  await expect(menu.getByRole('menuitemradio',{checked:true})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button',{name:'Lock resize',exact:true})).toBeFocused();
  await viewport.focus();
  await viewport.click();
  await expect(menu.getByRole('menuitemradio',{checked:true})).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(menu).toBeHidden();
  await expect(viewport).toBeFocused();
  await viewport.click();
  await page.getByRole('menuitemradio',{name:/^Mobile/}).click();
  const board=page.locator('.vh-canvas-artboard').first();
  const frame=page.frameLocator('.vh-canvas-artboard iframe').first();
  await page.getByRole('button',{name:'Hand tool',exact:true}).click();
  await frame.getByLabel('Workspace note').fill('Keep this live');
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await page.getByRole('button',{name:'Fit all',exact:true}).click();
  await expect(frame.getByLabel('Workspace note')).toHaveValue('Keep this live');
  const unlock=page.getByRole('button',{name:'Unlock resize',exact:true});
  if(await unlock.isVisible())await unlock.click();
  await board.getByRole('spinbutton',{name:'Width',exact:true}).fill('700');
  await expect(viewport).toContainText('Custom');
  await expect.poll(async()=>frame.locator('body').evaluate(()=>innerWidth)).toBe(700);
  await expect(frame.getByLabel('Workspace note')).toHaveValue('Keep this live');
  await expect.poll(async()=> (await (await request.get('/api/workspace/responsive-controls')).json()).layout.canvas?.preset).toBe('custom');
  await page.getByRole('button',{name:'Lock resize',exact:true}).click();
  await expect(board.getByRole('spinbutton',{name:'Width',exact:true})).toBeDisabled();
  await viewport.click();
  await page.getByRole('menuitemradio',{name:/^Desktop/}).click();
  await expect.poll(async()=>frame.locator('body').evaluate(()=>innerWidth)).toBe(1440);
  await expect.poll(async()=> (await (await request.get('/api/workspace/responsive-controls')).json()).layout.canvas?.preset).toBe('desktop');
  const after=(await (await request.get('/api/workspace/responsive-controls')).json()).layout;
  const boards=Object.values(after.canvas.artboards) as {x:number;y:number;width:number;height:number}[];
  boards.forEach((board,index)=>{expect(board.width).toBe(1440);expect(board.height).toBe(900);if(index>0)expect(board.x).toBeGreaterThanOrEqual(boards[index-1].x+boards[index-1].width);});
  await page.reload();
  await expect(page.getByRole('button',{name:'Canvas',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(viewport).toContainText('Desktop');
  await expect(page.getByRole('button',{name:'Arrange artboards',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Center selection',exact:true})).toBeVisible();
});

test('responsive detail keeps four independent instances, rejects forged identity and saves geometry separately',async({page,request,baseURL})=>{
  await setLayout(request,baseURL!,'responsive-controls');
  await page.goto('/items/responsive-controls');
  await expect(page.locator('.vh-save-status--saved')).toHaveAttribute('title','Saved');
  await page.getByRole('button',{name:'More actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Compare all',exact:true}).click();
  await page.getByRole('button',{name:'Responsive',exact:true}).click();
  await expect(page.locator('iframe')).toHaveCount(4);
  const sizes=[390,768,1440,1920];
  for(let i=0;i<4;i++){
    const frame=page.frameLocator('iframe').nth(i);
    await expect.poll(()=>frame.locator('body').evaluate(()=>innerWidth)).toBe(sizes[i]);
    // Offscreen instances are still live; assign through the input API without changing the camera.
    await frame.getByLabel('Workspace note').fill(`Independent ${i}`,{force:true});
  }
  for(let i=0;i<4;i++)await expect(page.frameLocator('iframe').nth(i).getByLabel('Workspace note')).toHaveValue(`Independent ${i}`);
  const href=page.url();
  await page.frameLocator('iframe').first().locator('body').evaluate(()=>parent.postMessage({source:'varianthub-preview',type:'shortcut',key:'ArrowRight',shiftKey:true,projectId:'wrong',itemKey:'responsive-controls',variantId:'direction-1',instanceId:'mobile'},location.origin));
  await page.getByRole('button',{name:'Fit all',exact:true}).click();
  expect(page.url()).toBe(href);
  await page.locator('.vh-canvas-artboard').first().getByRole('spinbutton',{name:'Width',exact:true}).fill('420');
  await expect.poll(async()=> (await (await request.get('/api/workspace/responsive-controls')).json()).layout.responsive?.['direction-1']?.artboards.mobile.width).toBe(420);
  expect((await (await request.get('/api/workspace/responsive-controls')).json()).layout.canvas).toBeUndefined();
  await page.getByRole('button',{name:'Next variant',exact:true}).click();
  await expect(page).toHaveURL(/direction-2/);
  await expect(page.locator('iframe[data-variant-id="direction-2"]')).toHaveCount(4);
  await page.getByRole('button',{name:'Previous variant',exact:true}).click();
  await expect(page.locator('iframe[data-variant-id="direction-1"]')).toHaveCount(4);
  await expect.poll(()=>page.frameLocator('iframe').first().locator('body').evaluate(()=>innerWidth)).toBe(420);
  await page.getByRole('button',{name:'Immersive',exact:true}).click();
  expect(await page.locator('iframe').count()).toBeLessThanOrEqual(3);
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('button',{name:'Responsive',exact:true})).toBeVisible();
  await expect(page.locator('.vh-immersive-navigation > span')).toHaveText('1 of 12');
  await expect(page.locator('.vh-immersive-navigation > span')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('a failed save stays recoverable and CSS tokens can be swapped without component changes',async({page,request,baseURL})=>{
  await setLayout(request,baseURL!,'responsive-controls');
  await page.goto('/items/responsive-controls');
  await expect(page.locator('.vh-save-status--saved')).toHaveAttribute('title','Saved');
  await page.route('**/api/workspace/responsive-controls',route=>route.request().method()==='PUT'?route.fulfill({status:503,body:'Unavailable'}):route.continue());
  await page.locator('button[title="3 columns"]:visible').click();
  await expect(page.getByRole('button',{name:/Retry save/})).toBeVisible();
  await page.unroute('**/api/workspace/responsive-controls');
  await page.getByRole('button',{name:/Retry save/}).click();
  await page.getByRole('dialog',{name:'Save layout details'}).getByRole('button',{name:'Retry save',exact:true}).click();
  await expect(page.locator('.vh-save-status--saved')).toHaveAttribute('title','Saved');
  await page.addStyleTag({content:'.vh-root,.vh-immersive{--vh-color-background:rgb(232,240,250);--vh-color-accent:rgb(32,80,64);--vh-radius-md:2px;--vh-font-sans:monospace}'});
  await expect(page.locator('.vh-root')).toHaveCSS('background-color','rgb(232, 240, 250)');
  await expect(page.locator('.vh-root')).toHaveCSS('font-family','monospace');
});

test('a legacy empty workspace restores every preview below the limit and a direct visit never changes source history',async({page,request,baseURL})=>{
  await setLayout(request,baseURL!,'responsive-controls',1,[]);
  const before=(await (await request.get('/api/workspace')).json()).metadata['responsive-controls'];
  await page.goto('/items/responsive-controls');
  await expect(page.locator('.vh-save-status--saved')).toHaveAttribute('title','Saved');
  await page.getByRole('button',{name:'More actions',exact:true}).click();
  await expect(page.getByRole('menuitem',{name:'Compare all',exact:true})).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('.vh-card')).toHaveCount(12);
  await expect.poll(async()=>(await (await request.get('/api/workspace/responsive-controls')).json()).layout.comparedVariantIds).toEqual(Array.from({length:12},(_,index)=>`direction-${index+1}`));
  await page.goto('/workspace');
  await expect(page.locator('.vh-exploration-card').filter({hasText:'Responsive controls'})).toContainText('Opened');
  expect((await (await request.get('/api/workspace')).json()).metadata['responsive-controls']).toEqual(before);
  const layout=(await (await request.get('/api/workspace/responsive-controls')).json()).layout;
  expect(layout.variantOrder).toEqual(Array.from({length:12},(_,index)=>`direction-${index+1}`));
  expect(layout.comparedVariantIds).toEqual(Array.from({length:12},(_,index)=>`direction-${index+1}`));
});
