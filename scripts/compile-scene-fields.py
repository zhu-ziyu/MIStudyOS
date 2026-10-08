"""Compile semantic ownership and real ink contours into numerical GPU fields.

No source bitmap is edited or exported. The reference is read to trace geometry;
the outputs are timing/ownership data consumed by the desktop renderer.
"""
import json
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/data'
W, H = 1672, 941
FW, FH = 836, 471
reference = cv2.imdecode(np.fromfile(ROOT / 'resource-packs/MiStudyOS_Home_4K_AssetPack/00_reference/home_reference_1672x941.png', np.uint8), cv2.IMREAD_GRAYSCALE)
owner = np.full((H, W), 14, np.uint8)

def polygon(points, value):
    cv2.fillPoly(owner, [np.array(points, np.int32)], value)

# Adjacent petals meet in the empty paper between their curved branches. An
# entire tassel belongs to one petal, including its hanging tip.
for side in (0, 1):
    xs = np.arange(65 if side == 0 else 1110, 594 if side == 0 else 1628, 4)
    pivot = 150 if side == 0 else 1460
    boundaries = [np.full_like(xs, 205),
                  369 + .00048 * (xs-pivot)**2,
                  514 + .00026 * (xs-pivot)**2,
                  655 + .00029 * (xs-pivot)**2,
                  np.full_like(xs, 875)]
    for row in range(4):
        points = list(zip(xs, boundaries[row])) + list(zip(xs[::-1], boundaries[row+1][::-1]))
        polygon(points, 2+row*2+side)

for side, row, rect in (
    (0,0,(86,259,34,125)), (0,0,(225,350,25,59)),
    (0,1,(47,411,34,122)), (0,1,(443,455,41,80)),
    (0,2,(45,548,31,123)), (0,2,(93,606,24,80)),
    (0,3,(118,757,31,105)), (0,3,(467,768,31,90)),
    (1,0,(1543,269,45,136)), (1,1,(1581,443,48,95)),
    (1,2,(1581,597,42,79)), (1,3,(1533,748,44,99)),
):
    x,y,w,h=rect
    owner[y:y+h,x:x+w]=2+row*2+side

# The character silhouette is independent of the UI. It cannot borrow a card
# border or flower connector simply because those pixels touch flowing hair.
char_points=[(669,0),(783,0),(858,4),(927,36),(977,97),(1004,170),
             (1011,228),(1062,287),(1118,327),(1151,382),(1169,438),
             (1158,479),(1188,516),(1204,549),(1170,581),(1155,611),
             (529,611),(491,579),(475,543),(451,517),(476,477),(482,437),
             (475,391),(510,350),(521,306),(532,254),(563,222),(568,175),
             (590,126),(600,72),(630,28)]
char_mask=np.zeros((H,W),np.uint8)
cv2.fillPoly(char_mask,[np.array(char_points,np.int32)],255)
char_mask=cv2.GaussianBlur(char_mask,(0,0),5)
owner[char_mask>2]=1

# One closed ornament surrounds both central cards. Reveal that ornament as a
# complete unit at the dashboard act, instead of slicing its sides into wings.
core=[(568,599),(581,595),(610,599),(1056,598),(1086,593),(1109,602),
      (1111,689),(1108,809),(1095,824),(581,824),(566,807),(566,633)]
polygon(core,10)
for x,y,rx,ry in ((574,598,36,28),(582,704,32,25),(580,813,29,23),
                   (1084,597,36,27),(1085,705,32,27),(1083,812,27,23)):
    cv2.ellipse(owner,(x,y),(rx,ry),0,0,360,10,-1)
for x,y,w,h in ((551,812,33,52),(1092,805,31,59),(630,821,23,42),(1026,819,23,40)):
    owner[y:y+h,x:x+w]=10
# Grade contents wait for their own act; the enclosure stays complete.
owner[725:806,608:1078]=11

# Bubble, foreground and scenery are mutually exclusive ownership too.
polygon([(1004,146),(1040,134),(1138,146),(1268,149),(1304,160),
         (1318,200),(1303,253),(1280,267),(1063,270),(1011,282),
         (1037,253),(1004,242),(987,203),(992,168)],12)
owner[875:,:][owner[875:,:]!=10]=13
polygon([(0,769),(139,772),(203,822),(368,855),(547,877),(565,941),(0,941)],13)
polygon([(1146,892),(1217,853),(1390,811),(1615,773),(1672,779),(1672,941),(1112,941)],13)
# Edge architecture is present from the first act, without intruding on petals.
owner[:,:62]=15
owner[:,1623:]=15
polygon([(0,0),(607,0),(653,62),(654,211),(622,220),(609,170),
         (572,143),(488,138),(375,115),(258,84),(0,184)],15)
polygon([(0,0),(1672,0),(1672,23),(985,30),(887,18),(665,0)],15)
# Character contours take precedence over an overlapping scenery crop.
owner[(owner==15)&(char_mask>2)]=1

coverage=np.full((H,W),255,np.uint8)
char_edge=cv2.distanceTransform(np.uint8(owner==1),cv2.DIST_L2,5)
soft_char=np.minimum(char_mask,np.uint8(np.clip(char_edge/6,0,1)*255))
coverage[owner==1]=soft_char[owner==1]
field=np.zeros((FH,FW,4),np.uint8)
field[:,:,0]=cv2.resize(owner,(FW,FH),interpolation=cv2.INTER_NEAREST)
field[:,:,1]=cv2.resize(coverage,(FW,FH),interpolation=cv2.INTER_AREA)
field[:,:,3]=255
(OUT/'scene-ownership.bin').write_bytes(field.tobytes())

# Canny contours follow visible ink edges. Long, open-feeling hair contours
# establish the shape first; facial features follow; fine hair and cloth finish.
# Each path advances by arc length, never by vertical screen position.
edges=cv2.Canny(reference,45,110)
edges[owner!=1]=0
contours,_=cv2.findContours(edges,cv2.RETR_LIST,cv2.CHAIN_APPROX_NONE)
strokes=[]
for contour in contours:
    points=contour.reshape(-1,2)
    if len(points)<12:
        continue
    # Break complex connected loops into strokes a pen can visibly traverse.
    for offset in range(0,len(points)-1,420):
        p=points[offset:offset+421]
        if len(p)<12:
            continue
        if p[0,1]>p[-1,1]:
            p=p[::-1]
        p=cv2.approxPolyDP(p.astype(np.float32),.48,False).reshape(-1,2)
        length=float(cv2.arcLength(p,False))
        if length<15:
            continue
        center=p.mean(axis=0)
        span=np.ptp(p,axis=0)
        face=745<center[0]<956 and 169<center[1]<332
        group=0 if length>145 and max(span)>90 else 1 if face else 2 if center[1]<370 else 3
        strokes.append({'points':p.tolist(),'length':length,'group':group})
strokes.sort(key=lambda s:(s['group'],-s['length']))
schedule=((540,1590),(1520,2160),(2010,3010),(2760,3710))
for group,(start,end) in enumerate(schedule):
    batch=[s for s in strokes if s['group']==group]
    for index,s in enumerate(batch):
        duration=min(690,max(95,s['length']*1.1))
        s['start']=round(start+(end-start-duration)*index/max(1,len(batch)-1))
        s['duration']=round(duration)

# Half-resolution arrival field: red encodes normalized time, blue coverage.
# Numerical timing can be bilinearly filtered; discrete ownership cannot.
arrival=np.full((FH,FW),65535.,np.float32)
ink_coverage=np.zeros((FH,FW),np.float32)
radius=.90
for stroke in strokes:
    points=np.array(stroke['points'])/2
    lengths=np.linalg.norm(np.diff(points,axis=0),axis=1)
    total=lengths.sum()
    distance=0
    for (ax,ay),(bx,by),length in zip(points[:-1],points[1:],lengths):
        x0=max(0,int(min(ax,bx)-radius));x1=min(FW,int(max(ax,bx)+radius)+2)
        y0=max(0,int(min(ay,by)-radius));y1=min(FH,int(max(ay,by)+radius)+2)
        yy,xx=np.mgrid[y0:y1,x0:x1]
        u=np.clip(((xx+.5-ax)*(bx-ax)+(yy+.5-ay)*(by-ay))/max(length*length,.0001),0,1)
        edge=np.hypot(xx+.5-ax-u*(bx-ax),yy+.5-ay-u*(by-ay))
        t=stroke['start']+stroke['duration']*(distance+u*length)/max(total,.001)
        valid=(edge<radius)&(t<arrival[y0:y1,x0:x1])
        arrival[y0:y1,x0:x1][valid]=t[valid]
        ink_coverage[y0:y1,x0:x1]=np.maximum(ink_coverage[y0:y1,x0:x1],np.clip((radius-edge)/.6,0,1))
        distance+=length
timing=np.zeros((FH,FW,4),np.uint8)
timing[:,:,0]=np.minimum(255,np.round(arrival/4096*255)).astype(np.uint8)
timing[:,:,2]=np.round(ink_coverage*255).astype(np.uint8)
timing[:,:,3]=255
(OUT/'mi-ink-timing.bin').write_bytes(timing.tobytes())
paths=[{'d':'M'+'L'.join(f'{x:g},{y:g}' for x,y in s['points']),
        'length':round(s['length'],1),'start':s['start'],'duration':s['duration'],
        'group':s['group']} for s in strokes]
(OUT/'mi-ink-strokes.json').write_text(json.dumps(paths,separators=(',',':')),encoding='utf-8')
report={'strokes':len(strokes),'leadContours':sum(s['group']==0 for s in strokes),
        'drawingEnd':max(s['start']+s['duration'] for s in strokes),
        'fieldSize':[FW,FH],'timingScale':4096,'coreOwner':10}
core_candidates=np.argwhere((owner==10)&(reference<95))
report['enclosureProbes']=[]
for x,y in ((575,610),(580,640),(576,756),(601,813),(1086,808),(1097,612),(1105,740),(565,845)):
    scores=(core_candidates[:,1]-x)**2+(core_candidates[:,0]-y)**2
    for index in np.argsort(scores)[:30]:
        cy,cx=map(int,core_candidates[index])
        if field[min(FH-1,round(cy*FH/H)),cx//2,0]==10:
            report['enclosureProbes'].append([cx,cy]);break
char_dark=(owner==1)&(reference<90)
report['strokeProbes']=[]
for low,high in ((950,1400),(2400,3000)):
    candidates=np.argwhere((timing[:,:,2]>245)&(arrival>low)&(arrival<high)&(field[:,:,0]==1))
    for cy,cx in candidates:
        x,y=int(cx*2+1),int(cy*2)
        if char_dark[y,x] and np.ptp(arrival[cy-1:cy+2,cx-1:cx+2])<130:
            report['strokeProbes'].append([x,y,round(float(arrival[cy,cx]))]);break
blank=cv2.resize(timing[:,:,2],(W,H),interpolation=cv2.INTER_LINEAR)<1
fill_candidates=np.argwhere(char_dark&blank)
cy,cx=fill_candidates[np.argmin((fill_candidates[:,1]-706)**2+(fill_candidates[:,0]-242)**2)]
report['fillProbe']=[int(cx),int(cy)]
(OUT/'scene-fields.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
