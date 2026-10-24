---
url: >-
  /pr-preview/pr-11154/guides/contributing/writing-documentation/writing-guides.md
---

# Writing Effective Guides

## 1. Know Your Audience

***Warp*Drive**'s Documentation has to balance appealing to many different audiences. Here are some example audiences:

* 1. VPs and Directors who hear about ***Warp*Drive** at a conference and feel their team should evaluate whether it solves their business problems
* 2. Tech Leads and Senior ICs or Architects who hear about it and want to decide if it solves their tech needs
* 3. Hobbyists who heard about it and want to try it for a weekend project
* 4. Engineers who just started at a company and want to learn about this thing the company uses
* 5. Existing Users who want to find the documentation for something, learn the project deeper, or need to know how to update from X to Y.

Our guides attempt to cater to these varied audiences by defaulting to the assumption that the reader is one that either does not use ***Warp*Drive** yet or is just getting started.

From this perspective, here are a few guidelines to keep in mind:

* Landing page / introduction content should attempt to entice decision makers (categories 1-3 above)
* Guides material should always start from the assumption that the readers don't have context on the project's history (categories 1-4)
* Concepts should always be cross-linked when possible, especially when first introducing the concept (everyone)
* Migrations guides can presume some historical knowledge of older concepts, but should not presume knowledge of newer concepts (categories 4 and 5)
* Guides material specific to legacy should be kept separate from other guides material (categories 4 and 5)

Some examples of ways to achieve this balance:

* [Upgrading](/upgrading/) is a top level section to help those category 5 users find what they are looking for faster.
* Explicitly named legacy pages (such as [Setup - Legacy (Ember)](/guides/configuration/ember) help those users without muddying instructions for everyone else. Note: this clarity also helps decision makers, as they will like to see that when the time for change comes there are resources to help them that are easy to find and well marked - but which they don't need to know about just yet.

## 2. Iterate, A Lot

Making great documentation requires a lot of iteration. A great way to iterate is to write documentation that someone needs, ask them to use it - and use the feedback from where they
stumble to improve the documentation for the next person. The more iteration that happens,
the more the docs become a source of information that works well for everyone.
