-- Theme system migration.
--
-- The appearance system moved from a two-axis colourTheme/styleTheme model to a
-- single drop-in theme selected by `themeId`, defaulting to the neutral "base"
-- theme. The old `styleTheme` axis no longer exists, and the seeded
-- `colourTheme = 'frog-peach'` default would otherwise override the new neutral
-- default, so retire both legacy seed rows. Frog & Peach is still available as a
-- bundled theme that admins can pick from the appearance panel.
--
-- Note: this removes the legacy appearance rows entirely. Any deployment that had
-- deliberately chosen a non-default colour theme can re-select it (or any theme)
-- from Admin -> Appearance after this migration.

DELETE FROM settings WHERE key IN ('colourTheme', 'styleTheme');
