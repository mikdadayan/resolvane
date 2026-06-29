/**
 * Populates ticket 56ec30fa-42ad-4f7a-8728-53c5a4a6fc21 with 20 alternating
 * agent/customer replies to simulate a long support conversation.
 *
 * Not idempotent — each run appends 20 more replies.
 */

import { prisma } from "../src/lib/prisma";
import { ReplySenderType } from "../src/generated/prisma/enums";

const TICKET_ID = "56ec30fa-42ad-4f7a-8728-53c5a4a6fc21";

const ticket = await prisma.ticket.findFirst({ where: { id: TICKET_ID, deletedAt: null } });
if (!ticket) {
  console.error(`Ticket ${TICKET_ID} not found.`);
  process.exit(1);
}

const agent = await prisma.user.findFirst({ where: { deletedAt: null }, select: { id: true, name: true } });
if (!agent) {
  console.error("No users found. Run the main seed script first.");
  process.exit(1);
}

const CUSTOMER_REPLIES = [
  `Hi, I'm writing because I've been having a really frustrating experience with my account over the past few days.
I purchased a course bundle last week and was charged successfully, but I still cannot access any of the course content.
Every time I log in and navigate to the "My Courses" section, the page just shows an empty list with no courses available.
I've tried logging out and back in multiple times, clearing my browser cache, and even switching to a different browser entirely.
None of these steps have resolved the issue, and I'm starting to wonder if there was a problem with my purchase.
I even received a confirmation email immediately after checkout, so I know the payment went through on my end.
My bank statement also shows the charge, so I'm confident the transaction was completed successfully.
I've been looking forward to starting this course for a long time, and this delay is really disappointing.
Could you please look into this as soon as possible? I'd like to start learning right away.
Any help you can provide would be greatly appreciated. Thank you for your time.`,

  `Thank you for the quick response! I really appreciate that you're looking into this for me.
I followed your suggestion and checked the email address associated with my account.
It turns out I might have used a slightly different email when purchasing — I have two email addresses I use regularly.
However, even after logging in with both emails, neither account seems to have the course content available.
I also tried using the password reset flow on both accounts to make sure I was getting into the right one.
Once I was logged in with both, I checked the "My Courses" and "Purchase History" sections thoroughly.
One of the accounts shows the purchase history and the charge, but the courses still don't appear in the library.
The other account is completely empty with no purchase history at all, so it must not be the right one.
I've attached a screenshot of the purchase history page from the correct account to help clarify the situation.
Please let me know what the next step should be — I'm happy to provide any additional information you need.`,

  `I checked my account settings again after your last message, and I'm still running into the same issue.
I verified my email address through the link you sent, and the account shows as "verified" in my profile settings.
Despite that confirmation, the courses are still not appearing in my library section.
I also noticed that when I click on the course link directly from my purchase confirmation email, it redirects me to the homepage.
It doesn't take me to the course content at all, which seems like a bug in the system.
I've tried accessing it on Chrome, Firefox, and Safari, and the behaviour is identical across all three browsers.
I also tried on my phone using the mobile browser, but the same redirect issue occurs there as well.
I'm starting to think this might be a server-side issue with how my purchase was linked to my account.
Could you check on your end whether the course access was properly provisioned after the payment was processed?
I'm really eager to get started, so please let me know if there's anything else I can do to help speed up the resolution.`,

  `Hi again, I wanted to follow up because it's been about 24 hours since your last message.
I still haven't been able to access my courses, and I'm getting increasingly concerned about this issue.
I tried the incognito/private browsing mode as you suggested in your last email, but the problem persists.
I also disabled all browser extensions and ad blockers to rule out any client-side interference, but no luck.
My internet connection is stable and working perfectly fine for all other websites and services I use daily.
I even tried accessing the platform from my workplace computer on a completely different network, but the result was the same.
Is there any way to escalate this issue to a technical team who might be able to fix it more quickly?
I paid for annual access and each day that passes without being able to use the course is frustrating and feels unfair.
I understand these things can take time, but I'd really appreciate a concrete update on where things stand.
Could you please give me an estimated timeline for when this will be resolved? Thank you.`,

  `Thank you for escalating this to your technical team — I really appreciate you taking it seriously.
I received the temporary access link you sent and was able to view the course introduction, which was a good sign.
However, after a few minutes the link expired and I was redirected back to the locked content page again.
I wasn't able to get very far into the material before losing access, which is unfortunately still not a full resolution.
I went back to check my account settings and the courses still do not appear under my permanent library.
I also noticed that my account profile page is missing the "Enrolled Courses" section entirely, which seems unusual.
Other users on the community forum have mentioned this section appears on their profile, so it seems like it should be there.
Is it possible that my account was set up incorrectly during registration, or that the course entitlement wasn't assigned properly?
I would be happy to create a brand new account if that would help resolve the issue faster.
Please advise on the best path forward — I just want to get learning as soon as possible.`,

  `I just wanted to let you know that I tried creating a brand new account using a fresh email address as you suggested.
After signing up, I attempted to use the purchase transfer option you described in your last message, but I hit an error.
The error message said "This purchase has already been associated with another account" when I tried to link it.
I'm not sure what that means since the original account doesn't seem to actually have access to the content.
I've been going back and forth on this for several days now and I'm feeling quite frustrated with the whole process.
I understand that technical issues happen, but this has taken much longer to resolve than I would have expected.
Is there a way for someone from the technical team to directly assign course access to my account from the backend?
That seems like it would be the most straightforward solution given everything that's happened so far.
If that's not possible, I'd also be open to a full refund at this point so I can explore other options.
I hope we can find a resolution soon — I've been a fan of this platform for a long time and this experience has been disappointing.`,

  `Thank you so much for the update — I'm glad the technical team was able to identify the root cause of the issue.
I can confirm that I can now see the courses appearing in my library, which is a huge relief!
I clicked through to the first module and was able to start watching the videos without any problems.
The content quality is exactly what I expected, and I'm excited to finally be able to start learning.
I do have one follow-up question: the course progress tracker doesn't seem to be recording my progress yet.
I watched the first two lessons all the way through, but the progress bar on the course overview page still shows 0%.
Is this something that typically takes a little time to sync, or is there another issue I should be aware of?
I want to make sure my progress is being saved properly so I don't have to re-watch lessons I've already completed.
Also, will there be any compensation for the week of access I lost while waiting for this to be resolved?
I'm not trying to be difficult — I just want to make sure I get the full value of what I paid for. Thank you!`,

  `I wanted to follow up on the progress tracking issue I mentioned in my last message.
It's now been two days since I first noticed the problem, and my progress still isn't being recorded correctly.
I've watched about eight lessons now, but the system consistently shows 0% completion on the course overview.
I've tried refreshing the page, logging out and back in, and even completing lessons on a different device to test it.
None of these steps have made any difference — the progress simply doesn't update after I watch a lesson.
I'm worried that if I continue watching without progress being tracked, I'll lose my place and have to start over.
Is there a known issue with the progress tracking system that your team is currently working on?
If so, could you give me an estimated timeline for when it might be fixed?
Also, I noticed that the bookmarks feature doesn't seem to be working either — I can't save my position in a video.
These are features I was really looking forward to using, so I hope they can be addressed soon.`,

  `Hi, I just wanted to send a quick update on where things stand from my end.
The progress tracking issue seems to have resolved itself sometime in the last day or so — I can now see my progress updating correctly.
I'm currently about 30% through the course and really enjoying the content so far — the explanations are very clear.
I do have a new concern though: I was trying to download some of the exercise files for the practical sections of the course.
When I click the download button, the page seems to start a download but then nothing actually appears in my downloads folder.
I've tried this on both my Mac and Windows computers, and the same thing happens on both.
I checked my browser's download settings and there don't seem to be any restrictions that would block the files.
My disk has plenty of free space, and I can download files from other websites without any issues.
Could this be a problem with the way the exercise files are hosted or served from your platform?
Any help with this would be much appreciated, as I really want to follow along with the hands-on portions of the course.`,

  `Hello, I'm back with one more question now that most of the previous issues have been resolved.
Everything is working much better now — the courses load fine, progress is tracked, and I can access all the video content.
The remaining issue is that the course completion certificate doesn't seem to be generating after I finished the first module.
The module progress bar shows 100%, but there's no certificate available in my profile under the "Achievements" section.
I checked the FAQ and it says certificates are issued automatically once a module is marked complete, but mine hasn't appeared.
It's been about 48 hours since I completed the module, so I don't think it's just a delay in processing.
I'd like to share my progress with my employer as part of my professional development goals, so this certificate is important.
Could you please check whether the certificate generation is working correctly for my account?
Also, I want to take a moment to acknowledge that despite the rocky start, the support team has been genuinely helpful.
I'm looking forward to completing the rest of the course and would love to see the certificate issue resolved soon.`,
];

const AGENT_REPLIES = [
  `Thank you for reaching out to us and for providing such a detailed description of the issue you're experiencing.
I'm sorry to hear that you're having trouble accessing your course content after completing your purchase.
I completely understand how frustrating this must be, especially when you're excited to start learning.
I've located your account in our system and can confirm that your payment was successfully processed on our end.
It appears there may have been a delay in provisioning your course access following the transaction.
This occasionally happens due to a sync issue between our payment processor and our course platform.
I'm going to manually trigger a re-sync of your account to ensure the course access is properly assigned.
In the meantime, could you please confirm the email address you used when completing the purchase?
This will help me verify that the access is being applied to the correct account in our system.
I'll follow up with you as soon as the sync has been completed, which should take no more than a few hours.`,

  `Thank you for the additional details and for providing the screenshot — that's very helpful.
Based on what you've described, it does appear that the purchase is linked to one account but the course access wasn't provisioned.
This can happen when a purchase is made while logged out and then the system creates a guest checkout session.
The payment records correctly, but the course entitlement isn't always linked back to an existing logged-in account.
I've checked your purchase history on our backend and can confirm this is exactly what happened in your case.
What I'd like you to do is send me the email address shown on the purchase confirmation email you received.
Once I have that, I can manually link the purchase to your primary account within our admin system.
This process usually takes about 15–30 minutes to fully propagate through our systems.
After that, you should see the course appear in your library the next time you log in and refresh the page.
I'll send you a follow-up confirmation once the linking has been completed on our end.`,

  `Thank you for your patience and for verifying your email address as requested.
I've gone ahead and manually linked your purchase to your primary account in our system.
The update has been applied and should be fully propagated within the next 30 minutes.
I also noticed that when your account was created, the "Course Library" permission flag wasn't set correctly.
This is a rare configuration issue that our team will be investigating to prevent it from affecting other users.
I've corrected the flag on your account, which should ensure you have full access going forward.
To verify the fix, please log out of your account completely and then log back in using your primary email address.
Once logged in, navigate to the "My Courses" section and you should see your purchased content listed there.
If the course still doesn't appear after following these steps, please don't hesitate to reach out again.
I'm also going to escalate this to our technical team to ensure there are no underlying issues with your account.`,

  `I sincerely apologise for the extended delay in resolving this issue, and I understand your frustration completely.
You are absolutely right that you should not have had to wait this long to access content you've already paid for.
I've escalated your case to our senior technical team and marked it as high priority for immediate attention.
Our team has identified a potential issue with how course access tokens are generated during certain purchase flows.
They are actively investigating the root cause and working on a permanent fix to prevent this from happening again.
In the meantime, I've manually generated a temporary access link that should allow you to view the course immediately.
I've sent this link to the email address on file for your account, so please check your inbox (and spam folder just in case).
The temporary link will remain active for 72 hours, which should give the team time to resolve the underlying issue.
I will personally follow up with you within the next 24 hours with a full update on the status of the fix.
Again, I am truly sorry for the inconvenience and appreciate your continued patience with us.`,

  `Thank you for the update, and I'm glad the temporary access link worked even if it was only briefly.
I can see from our system logs that you were able to view the first few lessons before the token expired — I'm sorry about that.
The "Enrolled Courses" section missing from your profile is a separate but related issue that our team has now identified.
It appears your account profile was created before we migrated to a new version of the platform, which caused some data gaps.
Our engineers have run a migration script to backfill the missing profile data for your account specifically.
You should now see the "Enrolled Courses" section appearing on your profile page after your next login.
The course access has also been permanently granted to your account — you should no longer need the temporary link.
I've asked our team to double-check the provisioning by running a verification script against your account.
Please try logging in again now and let me know immediately if you still don't see the course content in your library.
I'm closely monitoring your case and will ensure this is fully resolved before marking the ticket as closed.`,

  `I want to sincerely apologise for the error you encountered when trying to use the purchase transfer option.
The message "This purchase has already been associated with another account" is misleading in this context.
It doesn't mean someone else has your purchase — it means the purchase record is linked to the guest session from checkout.
Our engineers have resolved this by directly assigning course access on the backend, bypassing the transfer flow entirely.
I can confirm that your original account now has full, permanent access to all course content in your bundle.
You should not need to create a new account — please use your original login credentials going forward.
I understand this process has taken far longer than it should have, and I want to acknowledge your frustration.
As an apology for the inconvenience, I've added 30 days of extra access to your subscription at no additional charge.
This has already been applied to your account and will show up as an extended expiration date in your settings.
Please let me know if there is anything else I can do to make this right — your satisfaction is very important to us.`,

  `I'm delighted to hear that you now have access to your courses and are enjoying the content!
Regarding the progress tracking issue you mentioned, this is a known intermittent delay that our team is aware of.
Course progress typically syncs within a few minutes of completing a lesson, but it can sometimes take up to an hour.
If you're still seeing 0% after an hour of active watching, please try the following steps to manually trigger a sync.
First, navigate to the course overview page and click the "Refresh Progress" button in the top-right corner of the page.
If that button isn't visible, you can also trigger a sync by logging out and back in to your account.
Our team is working on improving the reliability of real-time progress tracking in an upcoming platform update.
Regarding compensation for the week of lost access, I've already applied a 30-day extension to your subscription.
If you feel this doesn't adequately address the inconvenience you experienced, please let me know and I'll review further options.
Thank you for your patience throughout this process — it means a great deal to our team.`,

  `Thank you for the update on the progress tracking issue and for your patience while we look into it further.
I've reviewed your account logs and can see that your lesson completion events are being sent to our tracking service.
However, it appears there's a delay in how they're being aggregated and reflected on the course overview page.
Our development team has been notified and they're working on a hot fix that should be deployed within the next 48 hours.
In the meantime, your progress is being recorded in the background even if it's not visually updating on screen.
This means you won't lose your place or need to re-watch any lessons once the fix is applied.
Regarding the bookmarks feature, this is currently in beta and only available to users on our Premium plan.
I've checked your account and you're currently on our Standard plan, which doesn't include bookmarks access.
If you'd like to upgrade to access this and other premium features, I can offer you a discounted upgrade price.
Please let me know if you'd like more details about the Premium plan and what it includes.`,

  `Great news — I'm glad to hear the progress tracking issue has resolved itself and that you're enjoying the course!
Regarding the exercise file download issue you've described, I've been able to reproduce this on our end as well.
It appears there's a bug in our download handler that was introduced in a recent platform update.
The download request is being initiated correctly, but the file transfer is being silently cancelled before completion.
Our engineering team is aware of this issue and has already submitted a fix that is currently in code review.
While we wait for the fix to be deployed, here is a workaround that should allow you to download the files immediately.
Right-click on the download button and select "Save Link As" from the context menu instead of left-clicking it.
This bypasses the download handler that's causing the issue and should allow the file to save correctly to your disk.
Please try this and let me know if it works for you — if not, I can send you the exercise files directly via email.
We expect the permanent fix to be deployed within the next few business days and will notify you once it's live.`,

  `Thank you for the positive feedback — I'm really glad to hear that most of the issues have been resolved!
Regarding the course completion certificate, I can see the issue clearly in our system.
Your module was marked as complete in our progress database, but the certificate generation job failed silently.
This happens in rare cases when our background job queue is under heavy load and a task times out.
I've manually triggered the certificate generation for your completed module, and it should appear shortly.
Please allow up to 30 minutes for the certificate to be generated and appear in your "Achievements" section.
You'll also receive an email notification with a direct link to your certificate once it's been issued.
The certificate is a verifiable PDF that you can download, print, or share digitally with your employer.
It will include your name, the course title, the completion date, and a unique verification code.
Thank you for sticking with us through all of these issues — your patience has been truly remarkable and we deeply appreciate it.`,
];

// Space replies 3 hours apart starting from 7 days ago
const BASE_TIME = Date.now() - 7 * 24 * 60 * 60 * 1000;
const INTERVAL_MS = 3 * 60 * 60 * 1000;

const replies = Array.from({ length: 20 }, (_, i) => {
  const isAgent = i % 2 === 1;
  return {
    id: crypto.randomUUID(),
    ticketId: TICKET_ID,
    senderType: isAgent ? ReplySenderType.agent : ReplySenderType.customer,
    authorId: isAgent ? agent.id : null,
    body: isAgent ? AGENT_REPLIES[Math.floor(i / 2)]! : CUSTOMER_REPLIES[Math.floor(i / 2)]!,
    createdAt: new Date(BASE_TIME + i * INTERVAL_MS),
  };
});

await prisma.ticketReply.createMany({ data: replies });

console.log(`Created 20 replies on ticket ${TICKET_ID} (agent: ${agent.name}).`);
await prisma.$disconnect();
