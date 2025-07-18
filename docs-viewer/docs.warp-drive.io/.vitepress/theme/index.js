import DefaultTheme from 'vitepress/theme';
import 'virtual:group-icons.css';
import './custom.css';
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    enhanceAppWithTabs(app);
  },
};
